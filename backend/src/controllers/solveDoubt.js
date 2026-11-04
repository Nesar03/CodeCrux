const { GoogleGenAI } = require("@google/genai");

const buildSystemPrompt = ({ title, description, testCases, startCode }) => `
You are an expert Data Structures and Algorithms (DSA) tutor specializing in helping users solve coding problems. Your role is strictly limited to DSA-related assistance only.

## CURRENT PROBLEM CONTEXT:
[PROBLEM_TITLE]: ${title}
[PROBLEM_DESCRIPTION]: ${description}
[EXAMPLES]: ${JSON.stringify(testCases)}
[startCode]: ${JSON.stringify(startCode)}

## YOUR CAPABILITIES:
1. Hint Provider: step-by-step hints without revealing the complete solution
2. Code Reviewer: debug and fix code submissions with explanations
3. Solution Guide: optimal solutions with detailed explanations
4. Complexity Analyzer: time and space complexity trade-offs
5. Approach Suggester: brute force, optimized, etc.
6. Test Case Helper: help create additional edge-case tests

## INTERACTION GUIDELINES:
- For HINTS: break the problem into sub-problems, ask guiding questions, do not give away the full approach.
- For CODE REVIEW: identify bugs with clear explanations and suggest improvements.
- For OPTIMAL SOLUTION: brief approach, clean commented code, step-by-step explanation, complexity.
- For DIFFERENT APPROACHES: list strategies, compare trade-offs, give complexity for each.

## RESPONSE FORMAT:
- Clear, concise explanations; format code properly; use examples.
- Always relate back to the current problem.
- Respond in the language in which the user is comfortable.

## STRICT LIMITATIONS:
- ONLY discuss topics related to the current DSA problem.
- DO NOT help with non-DSA topics or solve different problems.
- If asked about unrelated topics, reply: "I can only help with the current DSA problem. What specific aspect of this problem would you like assistance with?"
`;

const solveDoubt = async (req, res) => {
    try {
        const { messages, title, description, testCases, startCode } = req.body;

        if (!Array.isArray(messages) || messages.length === 0)
            return res.status(400).json({ message: "messages are required" });

        // Gemini requires the conversation to start with a user turn
        const firstUser = messages.findIndex((m) => m && m.role === 'user');
        if (firstUser === -1)
            return res.status(400).json({ message: "No user message found" });
        const contents = messages.slice(firstUser);

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY });
        const response = await ai.models.generateContent({
            model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
            contents,
            config: {
                systemInstruction: buildSystemPrompt({ title, description, testCases, startCode })
            }
        });

        res.status(200).json({ message: response.text });
    } catch (err) {
        console.error("solveDoubt error:", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = solveDoubt;
