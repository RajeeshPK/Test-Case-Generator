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

// Mock Database to simulate a vector DB backend.
const MOCK_TEST_SUITES_DB: { [key: string]: TestCase[] } = {
    'suite-proj-apollo': [
        { id: 'TC-APOLLO-001', title: 'User can view the main dashboard', steps: ['1. Log in', '2. Navigate to the dashboard URL'], expectedResult: 'The main dashboard with widgets is displayed.' },
        { id: 'TC-APOLLO-002', title: 'User can log out from profile menu', steps: ['1. Click the profile icon', '2. Click "Log Out"'], expectedResult: 'User is redirected to the login page.' },
    ],
    'suite-proj-gemini': [
        { id: 'TC-GEMINI-001', title: 'User can log in with valid credentials', steps: ['1. Enter valid email', '2. Enter valid password', '3. Click "Log In"'], expectedResult: 'User is successfully logged in and redirected to their dashboard.' },
        { id: 'TC-GEMINI-002', title: 'User sees error on login with invalid password', steps: ['1. Enter valid email', '2. Enter an incorrect password', '3. Click "Log In"'], expectedResult: 'An error message "Invalid credentials" is shown below the password field.' },
    ],
    'suite-proj-voyager': [
        { id: 'TC-VOYAGER-001', title: 'Generate a sales report for the last month', steps: ['1. Navigate to the "Reports" section', '2. Select "Sales Report"', '3. Set the date range to "Last Month"', '4. Click the "Generate" button'], expectedResult: 'A PDF of the sales report is downloaded.' },
    ],
};


// This function simulates the "Retrieval" part of RAG.
// In a real system, this would be a backend call that performs a semantic search.
const getRetrievedContext = (suiteId: string): string => {
    const suiteTests = MOCK_TEST_SUITES_DB[suiteId];
    if (!suiteTests || suiteTests.length === 0) {
        return "No existing test cases were found for this suite.";
    }

    // Format the retrieved tests into a string for the prompt
    const contextString = suiteTests.map(tc =>
        `ID: ${tc.id}\nTitle: ${tc.title}\nSteps: ${tc.steps.join('; ')}\nExpected Result: ${tc.expectedResult}`
    ).join('\n---\n');

    return contextString;
};


// Updated createPrompt to accept the actual retrieved context
const createPrompt = (requirements: string, contextType: string, retrievedContext?: string | null): string => {
    if (retrievedContext) {
        // This prompt now INCLUDES the retrieved context, making the gap analysis real.
        return `You are an expert Senior QA Engineer performing a gap analysis.
Your task is to analyze new requirements against a set of existing, relevant test cases retrieved from our test suite.

--- RETRIEVED CONTEXT (EXISTING TESTS) ---
${retrievedContext}
--- END OF RETRIEVED CONTEXT ---

Now, analyze the following NEW ${contextType}.
--- NEW ${contextType} ---
${requirements}
--- END OF NEW ${contextType} ---

Based on this, generate **only the new, unique test cases** required to fill coverage gaps.

Key Instructions:
1.  **Analyze Context:** Carefully review the existing tests in the RETRIEVED CONTEXT. Your primary goal is to avoid duplicating functionality already covered by them.
2.  **Match Style:** Ensure the generated test cases match the style, format, and tone of the retrieved examples.
3.  **Gap Analysis:** Focus exclusively on requirements not covered by the existing tests.
4.  **Empty Response:** If the new ${contextType} is already fully covered by the retrieved context, you MUST return an empty JSON array.

Generate the new test cases based on these instructions.`;
    }
    return `You are an expert Senior QA Engineer. Based on the following requirements, generate a comprehensive list of test cases. The requirements are: \n\n${requirements}`;
};

export const generateTestCasesFromText = async (requirements: string, suiteId?: string | null): Promise<TestCase[]> => {
    let retrievedContext: string | null = null;
    if (suiteId) {
        retrievedContext = getRetrievedContext(suiteId);
    }
    const prompt = createPrompt(requirements, "REQUIREMENTS", retrievedContext);

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
    let retrievedContext: string | null = null;
    if (suiteId) {
        retrievedContext = getRetrievedContext(suiteId);
    }
    
    const imagePart = {
        inlineData: { data: image.data, mimeType: image.mimeType },
    };
    
    const textPrompt = createPrompt("Analyze the following screenshot of a user interface. Based on the visible UI elements and their potential functionality, generate test cases.", "UI SCREENSHOT", retrievedContext);

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