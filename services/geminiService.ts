import { GoogleGenAI, Type } from "@google/genai";
import { TestCase } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const testCaseSchema = {
    type: Type.OBJECT,
    properties: {
        id: {
            type: Type.STRING,
            description: 'A unique identifier for the test case, e.g., "TC-001".'
        },
        title: {
            type: Type.STRING,
            description: 'A concise, descriptive title for the test case.'
        },
        steps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'An array of strings, where each string is a step to reproduce the test.'
        },
        expectedResult: {
            type: Type.STRING,
            description: 'The expected outcome after performing the steps.'
        }
    },
    required: ['id', 'title', 'steps', 'expectedResult']
};

const testCasesSchema = {
    type: Type.ARRAY,
    items: testCaseSchema
};

// In a real RAG system, the backend would fetch the relevant test cases based on the suiteId
// and inject them into the prompt. Here, we simulate this by changing the prompt's instructions.
const createPrompt = (requirements: string, contextType: string, suiteId?: string | null): string => {
    if (suiteId) {
        // This prompt now assumes a RAG backend has already found the most relevant
        // existing test cases and is providing them as context.
        return `You are an expert Senior QA Engineer using a Retrieval-Augmented Generation (RAG) system.
The system has already retrieved the most relevant existing test cases based on the new requirements.

Your task is to analyze the following NEW ${contextType} and the retrieved context.
--- NEW ${contextType} ---
${requirements}
--- END OF NEW ${contextType} ---

Based on this, generate **only the new, unique test cases** required to fill coverage gaps.

Key Instructions:
1.  **Analyze Retrieved Context:** Assume the context provided by the RAG system is relevant. Your primary goal is to avoid duplicating the functionality shown in that context.
2.  **Match Style:** Ensure the generated test cases match the style, format, and tone of the (unseen) retrieved examples.
3.  **Gap Analysis:** Focus exclusively on what's missing.
4.  **Empty Response:** If the new ${contextType} is already fully covered by the retrieved context, you MUST return an empty JSON array.

Generate the new test cases based on these instructions.`;
    }
    return `You are an expert Senior QA Engineer. Based on the following requirements, generate a comprehensive list of test cases. The requirements are: \n\n${requirements}`;
};

export const generateTestCasesFromText = async (requirements: string, suiteId?: string | null): Promise<TestCase[]> => {
    const prompt = createPrompt(requirements, "REQUIREMENTS", suiteId);

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: testCasesSchema,
            }
        });

        const jsonText = response.text.trim();
        // Handle cases where the model correctly returns an empty string for an empty array
        if (jsonText === "") return [];
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error generating test cases from text:", error);
        throw new Error("Failed to parse test cases from the AI's response. The format might be invalid.");
    }
};

export const generateTestCasesFromScreenshot = async (image: { data: string; mimeType: string }, suiteId?: string | null): Promise<TestCase[]> => {
    const imagePart = {
        inlineData: { data: image.data, mimeType: image.mimeType },
    };
    
    const textPrompt = createPrompt("Analyze the following screenshot of a user interface. Based on the visible UI elements and their potential functionality, generate test cases.", "UI SCREENSHOT", suiteId);

    const textPart = {
        text: textPrompt
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart, imagePart] },
             config: {
                responseMimeType: "application/json",
                responseSchema: testCasesSchema,
            }
        });
        
        const jsonText = response.text.trim();
        // Handle cases where the model correctly returns an empty string for an empty array
        if (jsonText === "") return [];
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error generating test cases from screenshot:", error);
        throw new Error("Failed to parse test cases from the AI's response. The format might be invalid.");
    }
};
