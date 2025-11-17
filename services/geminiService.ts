
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

export const generateTestCasesFromText = async (requirements: string): Promise<TestCase[]> => {
    const prompt = `Based on the following requirements, generate a comprehensive list of test cases. The requirements are: \n\n${requirements}`;

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

export const generateTestCasesFromScreenshot = async (image: { data: string; mimeType: string }): Promise<TestCase[]> => {
    const imagePart = {
        inlineData: { data: image.data, mimeType: image.mimeType },
    };
    const textPart = {
        text: "Analyze the following screenshot of a user interface. Based on the visible UI elements and their potential functionality, generate a comprehensive list of test cases."
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
