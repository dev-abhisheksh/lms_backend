export function moduleDescriptionPrompt({ course, module, audience }) {
    return `
You are an academic content assistant for a Learning Management System.

Generate a concise, professional module description.

Rules:
- No marketing language
- No emojis
- Max 100 words
- Clear learning focus
- Do NOT invent tools or technologies

Course: ${course}
Module Title: ${module}
Audience Level: ${audience}

Return only the description text.
`;
}

export function reWriteAssignemtQuestionPrompt({ question }) {
    return `
    You're a assisting a teacher in improving an assignment question.

    Task: 
    Rewrite the question ONLY to improve clarity, grammar, and structure.

    Strict rules:
    - Do NOT change the meaning
    - Do NOT add new requiremnets
    - Do NOT remove any requirements
    - Do NOT add examples
    - Do NOT change marks or constraints
    - Preserve the original intent exactly

    Original assignment question"
    ${question}

    Return ONLY the rewritten question text
    `
}

export function enhanceCourseDescriptionPrompt({ description }) {
    return `
    You're assisting an educatorin refining a course description.

    Task:
    - Do NOT change the meaning
    - Do NOT add or remove topics
    - Do NOT add examples or lesson content 
    - Maintain a high-level overview tone
    - Keep length under 120 words

    Original description: 
    ${description}

    Return ONLY the improved description text
    `
}

export function enhanceAssignmentDescriptionPrompt({ description }) {
    return `
        You're assisiting a teacher in rewriting an assignment question.

        Task:
        Rewrite the question ONLY to improve clarity, grammar, and structure

        Strict rules:
        - Do NOT change the meaning
        - Do NOT add or remove requirements
        - Do NOT add examples
        - Do NOT change marks, constraints, or scope

        Original assignment question:
        ${description}

        Return ONLY the rewritten question text
    `
}

export function enhanceModuleDescriptionPrompt({ description }) {
    return `
    You're assisting an educator in refininga module description.

    Task:
    Improve clarity and structure of the module description

    Rules:
- Do NOT change intent or scope
- Do NOT add new topics
- Do NOT include learning objectives
- Keep content focused on a specific module
- Keep length under 80 words

Original description:
"""
${description}
"""

Return ONLY the improved description text.
    `
}

export function enhanceLessonDescriptionPrompt({ description }) {
    return `
You are assisting an educator in refining a lesson description.

Task:
Improve clarity and readability of the lesson description.

Rules:
- Do NOT add explanations or examples
- Do NOT expand the scope
- Do NOT change meaning
- Keep length under 60 words

Original description:
"""
${description}
"""

Return ONLY the improved description text.
`;
}
