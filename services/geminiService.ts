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

const createPrompt = (requirements: string, contextType: string, existingTestsContext?: string): string => {
    if (existingTestsContext) {
        return `You are an expert Senior QA Engineer tasked with augmenting an existing test suite.

--- EXISTING TEST SUITE EXAMPLES ---
${existingTestsContext}
--- END OF EXISTING TEST SUITE ---

First, carefully analyze the EXISTING TEST SUITE above to understand the current testing scope, format, style, and ID conventions.

Next, review the following NEW ${contextType}:
--- NEW ${contextType} ---
${requirements}
--- END OF NEW ${contextType} ---

Your goal is to generate **only the new, unique test cases** required to cover the NEW ${contextType} that are not already covered by the EXISTING TEST SUITE.

Key Instructions:
1.  **Avoid Duplication:** Do not generate test cases for functionality that is already adequately covered in the existing suite.
2.  **Match Style:** Ensure the generated test cases precisely match the style, format, tone, and ID-naming convention of the existing ones.
3.  **Gap Analysis:** Focus exclusively on filling the gaps in test coverage based on the new ${contextType}.
4.  **Empty Response:** If the new ${contextType} are already fully covered by the existing suite, you MUST return an empty JSON array.

Generate the new test cases based on these instructions.`;
    }
    return `You are an expert Senior QA Engineer. Based on the following requirements, generate a comprehensive list of test cases. The requirements are: \n\n${requirements}`;
};

export const generateTestCasesFromText = async (requirements: string, existingTestsContext?: string): Promise<TestCase[]> => {
    const prompt = createPrompt(requirements, "REQUIREMENTS", existingTestsContext);

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
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error generating test cases from text:", error);
        throw new Error("Failed to parse test cases from the AI's response. The format might be invalid.");
    }
};

export const generateTestCasesFromScreenshot = async (image: { data: string; mimeType: string }, existingTestsContext?: string): Promise<TestCase[]> => {
    const imagePart = {
        inlineData: { data: image.data, mimeType: image.mimeType },
    };
    
    const textPrompt = createPrompt("Analyze the following screenshot of a user interface. Based on the visible UI elements and their potential functionality, generate test cases.", "UI SCREENSHOT", existingTestsContext);

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
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error generating test cases from screenshot:", error);
        throw new Error("Failed to parse test cases from the AI's response. The format might be invalid.");
    }
};
