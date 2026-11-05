const mongoose = require("mongoose");
const cloudinary = require('cloudinary').v2;
const { executeTestCases, getLanguageConfig } = require("../utils/problemUtility");
const Problem = require("../models/problem");
const User = require("../models/user");
const Submission = require("../models/submission");
const SolutionVideo = require("../models/solutionVideo");

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const TAGS = ['array', 'linkedList', 'graph', 'dp'];

// Only these fields may be written from the request body
const pickProblemFields = (body) => {
    const {
        title, description, difficulty, tags,
        visibleTestCases, hiddenTestCases, startCode, referenceSolution
    } = body;
    return { title, description, difficulty, tags, visibleTestCases, hiddenTestCases, startCode, referenceSolution };
};

const validateProblemBody = (p) => {
    if (!p.title || !p.description) return "Title and description are required";
    if (!DIFFICULTIES.includes(p.difficulty)) return "Invalid difficulty";
    if (!TAGS.includes(p.tags)) return "Invalid tag";
    if (!Array.isArray(p.visibleTestCases) || p.visibleTestCases.length === 0) return "At least one visible test case is required";
    if (!Array.isArray(p.hiddenTestCases) || p.hiddenTestCases.length === 0) return "At least one hidden test case is required";
    if (!Array.isArray(p.startCode) || p.startCode.length === 0) return "Start code is required";
    if (!Array.isArray(p.referenceSolution) || p.referenceSolution.length === 0) return "Reference solution is required";
    for (const { language } of p.referenceSolution) {
        if (!getLanguageConfig(language)) return `Unsupported language '${language}'`;
    }
    return null;
};

// Run every reference solution against the visible test cases
const verifyReferenceSolutions = async (referenceSolution, visibleTestCases) => {
    for (const { language, completeCode } of referenceSolution) {
        const testResult = await executeTestCases(completeCode, language, visibleTestCases);
        for (const test of testResult) {
            if (test.status_id !== 3) {
                return `Reference solution for ${language} failed: ${test.verdict}`;
            }
        }
    }
    return null;
};

const createProblem = async (req, res) => {
    try {
        const data = pickProblemFields(req.body);
        const invalid = validateProblemBody(data);
        if (invalid) return res.status(400).send(invalid);

        const failure = await verifyReferenceSolutions(data.referenceSolution, data.visibleTestCases);
        if (failure) return res.status(400).send(failure);

        await Problem.create({ ...data, problemCreator: req.result._id });
        res.status(201).send("Problem Saved Successfully");
    } catch (err) {
        res.status(err.statusCode || 400).send("Error: " + (err.message || err));
    }
};

const updateProblem = async (req, res) => {
    const { id } = req.params;
    try {
        if (!id || !mongoose.isValidObjectId(id))
            return res.status(400).send("Invalid or missing ID");

        const existing = await Problem.findById(id);
        if (!existing)
            return res.status(404).send("Problem not found");

        const data = pickProblemFields(req.body);
        const invalid = validateProblemBody(data);
        if (invalid) return res.status(400).send(invalid);

        const failure = await verifyReferenceSolutions(data.referenceSolution, data.visibleTestCases);
        if (failure) return res.status(400).send(failure);

        const updated = await Problem.findByIdAndUpdate(id, data, { runValidators: true, new: true });
        res.status(200).send(updated);
    } catch (err) {
        res.status(err.statusCode || 500).send("Error: " + (err.message || err));
    }
};

const deleteProblem = async (req, res) => {
    const { id } = req.params;
    try {
        if (!id || !mongoose.isValidObjectId(id))
            return res.status(400).send("Invalid or missing ID");

        const deletedProblem = await Problem.findByIdAndDelete(id);
        if (!deletedProblem)
            return res.status(404).send("Problem not found");

        // Fetch videos BEFORE deleting their DB records, so we still have the Cloudinary IDs
        const videos = await SolutionVideo.find({ problemId: id });

        // Remove the files from Cloudinary. allSettled means one failure won't stop the rest.
        const results = await Promise.allSettled(
            videos.map((v) =>
                cloudinary.uploader.destroy(v.cloudinaryPublicId, {
                    resource_type: 'video',
                    invalidate: true
                })
            )
        );
        results.forEach((r, i) => {
            if (r.status === 'rejected') {
                console.error('Cloudinary delete failed for', videos[i].cloudinaryPublicId, r.reason?.message);
            }
        });

        // Clean up everything that referenced the problem
        await Promise.all([
            Submission.deleteMany({ problemId: id }),
            User.updateMany({ problemSolved: id }, { $pull: { problemSolved: id } }),
            SolutionVideo.deleteMany({ problemId: id })
        ]);

        res.status(200).send("Successfully Deleted");
    } catch (err) {
        res.status(500).send("Error: " + err.message);
    }
};

const getProblemById = async (req, res) => {
    const { id } = req.params;
    try {
        if (!id || !mongoose.isValidObjectId(id))
            return res.status(400).send("Invalid or missing ID");

        const isAdmin = req.result.role === 'admin';
        const hasSolved = (req.result.problemSolved || []).some((p) => String(p) === String(id));

        // Hidden test cases are admin-only. Reference solutions are visible only after solving.
        let fields = '_id title description difficulty tags visibleTestCases startCode';
        if (isAdmin) fields += ' hiddenTestCases referenceSolution';
        else if (hasSolved) fields += ' referenceSolution';

        const getProblem = await Problem.findById(id).select(fields);
        if (!getProblem)
            return res.status(404).send("Problem not found");

        const responseData = getProblem.toObject();

        const video = await SolutionVideo.findOne({ problemId: id }).sort({createdAt: -1});
        if (video) {
            responseData.secureUrl = video.secureUrl;
            responseData.thumbnailUrl = video.thumbnailUrl;
            responseData.duration = video.duration;
        }

        res.status(200).send(responseData);
    } catch (err) {
        res.status(500).send("Error: " + err.message);
    }
};

const getAllProblem = async (req, res) => {
    try {
        const problems = await Problem.find({}).select('_id title difficulty tags');
        res.status(200).send(problems); // empty list is a valid result
    } catch (err) {
        res.status(500).send("Error: " + err.message);
    }
};

const solvedAllProblembyUser = async (req, res) => {
    try {
        const user = await User.findById(req.result._id).populate({
            path: "problemSolved",
            select: "_id title difficulty tags"
        });
        res.status(200).send(user.problemSolved);
    } catch (err) {
        res.status(500).send("Server Error");
    }
};

const submittedProblem = async (req, res) => {
    try {
        const userId = req.result._id;
        const problemId = req.params.pid;

        if (!mongoose.isValidObjectId(problemId))
            return res.status(400).send("Invalid problem ID");

        const ans = await Submission.find({ userId, problemId }).sort({ createdAt: -1 });
        res.status(200).send(ans); // always an array
    } catch (err) {
        res.status(500).send("Internal Server Error");
    }
};

module.exports = {
    createProblem,
    updateProblem,
    deleteProblem,
    getProblemById,
    getAllProblem,
    solvedAllProblembyUser,
    submittedProblem
};
