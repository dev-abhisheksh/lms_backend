import { generateWithGemini } from "../services/ai/gemini.service.js";
import { enhanceAssignmentDescriptionPrompt, enhanceCourseDescriptionPrompt, enhanceLessonDescriptionPrompt, enhanceModuleDescriptionPrompt, moduleDescriptionPrompt, reWriteAssignemtQuestionPrompt } from "../services/ai/prompts.js";

const generateModuleDescription = async (req, res) => {
    try {
        const { course, module, audience } = req.body

        if (!course || !module) return res.status(400).json({ message: "Missing required fields" })

        const prompt = moduleDescriptionPrompt({
            course,
            module,
            audience: audience || "Beginner"
        })

        const text = await generateWithGemini(prompt)

        res.status(200).json({
            generatedText: text
        })
    } catch (error) {
        console.log("AI generation failed", error)
        return res.status(500).json({ message: "AI generation failed" })
    }
}

const reWriteAssignmentQuestion = async (req, res) => {
    const { question } = req.body;
    if (!question || question.trim().length < 10) {
        return res.status(400).json({ message: "Assignment question too short" })
    }

    const prompt = reWriteAssignemtQuestionPrompt({ question })

    const rewritten = await generateWithGemini(prompt)

    res.status(200).json({
        improvedQuestion: rewritten
    })
}

const enhanceDescription = async (req, res) => {
    try {
        const { type, description } = req.body
        if (!type || !description) return res.status(400).json({ message: "Both fields are required" })

        const text = description.trim()

        if (text.length < 10) {
            return res.status(400).json({ message: "Description is too short to ehance" })
        }

        if (text.length > 800) {
            return res.status(400).json({ message: "Description is too large for AI Enhance" })
        }

        let prompt;

        switch (type) {
            case "course":
                prompt = enhanceCourseDescriptionPrompt({ description: text })
                break;

            case "module":
                prompt = enhanceModuleDescriptionPrompt({ description: text })
                break

            case "assignment":
                prompt = enhanceAssignmentDescriptionPrompt({ description: text })
                break

            case "lesson":
                prompt = enhanceLessonDescriptionPrompt({ description: text })
                break

            default:
                return res.status(400).json({ message: "Invalid description type" })
        }

        const enhaced = await generateWithGemini(prompt)

        res.status(200).json({
            enhanceDescription: enhaced
        })
    } catch (error) {
        console.error(err.message);
        res.status(500).json({ message: "AI enhancement failed" });
    }
}

export {
    generateModuleDescription,
    reWriteAssignmentQuestion,
    enhanceDescription
}