const Problem = require("../models/problem");
const Submission = require("../models/submission");
const User = require("../models/user");
const { getLanguageConfig, executeTestCases } = require("../utils/problemUtility");

const submitCode = async (req, res) => {
    try {
        const userId = req.result._id;
        const problemId = req.params.id;

        let { code, language } = req.body;

        if (!userId || !code || !problemId || !language) {
            return res.status(400).send("Some field missing");
        }

        if (language === 'cpp') {
            language = 'c++';
        }

        const langConfig = getLanguageConfig(language);
        if (!langConfig) {
            return res.status(400).send("Unsupported language. Supported languages: c++, java, javascript");
        }

        // Fetch the problem from database
        const problem = await Problem.findById(problemId);
        if (!problem) {
            return res.status(404).send("Problem not found");
        }

        // Store initial pending submission in Database
        const submittedResult = await Submission.create({
            userId,
            problemId,
            code,
            language,
            status: 'pending',
            testCasesTotal: problem.hiddenTestCases.length
        });

        // Execute hidden test cases with JDoodle
        let testResult;
        try {
            testResult = await executeTestCases(code, language, problem.hiddenTestCases);
        } catch (execErr) {
            // Don't leave the submission stuck in 'pending'
            submittedResult.status = 'error';
            submittedResult.errorMessage = execErr.message;
            await submittedResult.save();
            throw execErr;
        }

        // Calculate verdicts and resource consumption
        let testCasesPassed = 0;
        let runtime = 0;
        let memory = 0;
        let status = 'accepted';
        let errorMessage = null;

        for (const test of testResult) {
            if (test.status_id === 3) {
                testCasesPassed++;
                runtime += parseFloat(test.time || 0);
                memory = Math.max(memory, test.memory || 0);
            } else {
                if (test.status_id === 4) {
                    if (status !== 'error') {
                        status = 'wrong';
                    }
                } else {
                    status = 'error';
                }
                if (!errorMessage && test.stderr) {
                    errorMessage = test.stderr;
                }
            }
        }

        runtime = Math.round(runtime * 1000) / 1000;

        // Store the result in Database in Submission
        submittedResult.status = status;
        submittedResult.testCasesPassed = testCasesPassed;
        submittedResult.errorMessage = errorMessage || '';
        submittedResult.runtime = runtime;
        submittedResult.memory = memory;

        await submittedResult.save();

        // Update user problemSolved list if submission was accepted
        if (status === 'accepted' && !req.result.problemSolved.some((p) => String(p) === String(problemId))) {
            req.result.problemSolved.push(problemId);
            await req.result.save();
        }

        const accepted = (status === 'accepted');
        const errorText = status === 'wrong' ? 'Wrong Answer' : (status === 'error' ? (errorMessage || 'Error') : null);

        res.status(201).json({
            accepted,
            totalTestCases: submittedResult.testCasesTotal,
            passedTestCases: testCasesPassed,
            runtime,
            memory,
            error: errorText
        });

    } catch (err) {
        console.error("submitCode error:", err);
        if (err.name === 'CastError') return res.status(400).send("Invalid problem ID");
        res.status(err.statusCode || 500).send("Error: " + err.message);
    }
};

const runCode = async (req, res) => {
    try {
        const userId = req.result._id;
        const problemId = req.params.id;

        let { code, language } = req.body;

        if (!userId || !code || !problemId || !language) {
            return res.status(400).send("Some field missing");
        }

        // Fetch the problem from database
        const problem = await Problem.findById(problemId);
        if (!problem) {
            return res.status(404).send("Problem not found");
        }

        if (language === 'cpp') {
            language = 'c++';
        }

        const langConfig = getLanguageConfig(language);
        if (!langConfig) {
            return res.status(400).send("Unsupported language. Supported languages: c++, java, javascript");
        }

        // Execute visible test cases with JDoodle
        const testResult = await executeTestCases(code, language, problem.visibleTestCases);

        let testCasesPassed = 0;
        let runtime = 0;
        let memory = 0;
        let status = true;
        let errorMessage = null;

        for (const test of testResult) {
            if (test.status_id === 3) {
                testCasesPassed++;
                runtime += parseFloat(test.time || 0);
                memory = Math.max(memory, test.memory || 0);
            } else {
                status = false;
                if (!errorMessage && test.stderr) {
                    errorMessage = test.stderr;
                }
            }
        }

        runtime = Math.round(runtime * 1000) / 1000;

        res.status(200).json({
            success: status,
            testCases: testResult,
            runtime,
            memory
        });

    } catch (err) {
        console.error("runCode error:", err);
        if (err.name === 'CastError') return res.status(400).send("Invalid problem ID");
        res.status(err.statusCode || 500).send("Error: " + err.message);
    }
};

module.exports = { submitCode, runCode };
