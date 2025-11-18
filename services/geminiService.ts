
import { GoogleGenAI, Type } from "@google/genai";
import { TestCase, AppSettings, LLMProvider, DEFAULT_SETTINGS } from '../types';

// --- SETTINGS MANAGEMENT ---
let currentSettings: AppSettings = { ...DEFAULT_SETTINGS };

export const updateGenAISettings = (settings: AppSettings) => {
    currentSettings = settings;
    console.log("LLM Provider updated:", currentSettings.provider);
};

// --- CLIENT MANAGEMENT ---

const getGeminiClient = () => {
    const apiKey = currentSettings.geminiApiKey || process.env.API_KEY;
    if (!apiKey) {
        throw new Error("Google Gemini API Key is missing. Please set it in Settings or ensure API_KEY is in environment variables.");
    }
    return new GoogleGenAI({ apiKey });
};

// --- SCHEMA DEFINITIONS ---

const testCaseSchemaObj = {
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
    items: testCaseSchemaObj
};

// Helper for Local LLM to understand structure since we can't pass the Schema object directly
const JSON_STRUCTURE_PROMPT = `
You MUST respond with valid JSON only. The response should be an array of objects matching this structure:
[
  {
    "id": "TC-001",
    "title": "Test Title",
    "steps": ["Step 1", "Step 2"],
    "expectedResult": "Expected Result"
  }
]
`;

// --- UTILITY: DEDUPLICATION ---

const normalizeForComparison = (str: string) => str.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

const getJaccardSimilarity = (str1: string, str2: string) => {
    const set1 = new Set(normalizeForComparison(str1).split(/\s+/));
    const set2 = new Set(normalizeForComparison(str2).split(/\s+/));
    
    if (set1.size === 0 || set2.size === 0) return 0.0;

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
};

const isDuplicate = (newCase: TestCase, existingCases: TestCase[]): boolean => {
    return existingCases.some(existing => {
        // Check Title Similarity
        const titleSim = getJaccardSimilarity(newCase.title, existing.title);
        if (titleSim > 0.75) return true; // High threshold for title similarity

        // Check Content Similarity (Steps + Result combined)
        const newContent = `${newCase.steps.join(' ')} ${newCase.expectedResult}`;
        const existingContent = `${existing.steps.join(' ')} ${existing.expectedResult}`;
        const contentSim = getJaccardSimilarity(newContent, existingContent);
        
        if (contentSim > 0.85) return true; // Very high threshold for content similarity

        return false;
    });
};

// --- SINGLE SOURCE OF TRUTH MOCK DATABASE ---

interface SuiteData {
    name: string;
    testCases: TestCase[];
}

const MOCK_DB: { [key: string]: SuiteData } = {
    'suite-proj-apollo': {
        name: 'Project Apollo - Core Features',
        testCases: [
            { id: 'TC-APOLLO-001', title: 'User can view the main dashboard', steps: ['1. Log in', '2. Navigate to the dashboard URL'], expectedResult: 'The main dashboard with widgets is displayed.' },
            { id: 'TC-APOLLO-002', title: 'User can log out from profile menu', steps: ['1. Click the profile icon', '2. Click "Log Out"'], expectedResult: 'User is redirected to the login page.' },
        ]
    },
    'suite-proj-gemini': {
        name: 'Project Gemini - User Authentication',
        testCases: [
            { id: 'TC-GEMINI-001', title: 'User can log in with valid credentials', steps: ['1. Enter valid email', '2. Enter valid password', '3. Click "Log In"'], expectedResult: 'User is successfully logged in and redirected to their dashboard.' },
            { id: 'TC-GEMINI-002', title: 'User sees error on login with invalid password', steps: ['1. Enter valid email', '2. Enter an incorrect password', '3. Click "Log In"'], expectedResult: 'An error message "Invalid credentials" is shown below the password field.' },
        ]
    },
    'suite-proj-voyager': {
        name: 'Project Voyager - Reporting Module',
        testCases: [
            { id: 'TC-VOYAGER-001', title: 'Generate a sales report for the last month', steps: ['1. Navigate to the "Reports" section', '2. Select "Sales Report"', '3. Set the date range to "Last Month"', '4. Click the "Generate" button'], expectedResult: 'A PDF of the sales report is downloaded.' },
        ]
    },
};

// --- SUITE MANAGEMENT API ---

export const getSuites = async (): Promise<{ id: string; name: string }[]> => {
    return Object.entries(MOCK_DB).map(([id, data]) => ({ id, name: data.name }));
};

export const registerNewSuite = async (suiteName: string): Promise<{ id: string; name: string }> => {
    const suiteId = `suite-custom-${Date.now()}`;
    if (!MOCK_DB[suiteId]) {
        MOCK_DB[suiteId] = {
            name: suiteName,
            testCases: []
        };
        console.log(`Registered new suite: ${suiteName} (ID: ${suiteId})`);
    }
    return { id: suiteId, name: suiteName };
};

export const deleteSuite = async (suiteId: string): Promise<boolean> => {
    if (MOCK_DB[suiteId]) {
        delete MOCK_DB[suiteId];
        console.log(`Deleted suite with ID: ${suiteId}`);
        return true;
    }
    console.warn(`Attempted to delete non-existent suite with ID: ${suiteId}`);
    return false;
};


const getRetrievedContext = (suiteId: string): string => {
    const suiteData = MOCK_DB[suiteId];
    if (!suiteData || suiteData.testCases.length === 0) {
        return "No existing test cases were found for this suite.";
    }

    const contextString = suiteData.testCases.map(tc =>
        `ID: ${tc.id}\nTitle: ${tc.title}\nSteps: ${tc.steps.join('; ')}\nExpected Result: ${tc.expectedResult}`
    ).join('\n---\n');

    return contextString;
};

// --- OLLAMA HELPER ---

const generateWithOllama = async (prompt: string, images?: string[]): Promise<string> => {
    const endpoint = `${currentSettings.ollamaBaseUrl.replace(/\/$/, '')}/api/generate`;
    
    try {
        const body: any = {
            model: currentSettings.ollamaModel,
            prompt: prompt,
            format: 'json',
            stream: false,
        };

        if (images && images.length > 0) {
            body.images = images;
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(`Ollama API Error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.response;
    } catch (error) {
        console.error("Ollama Connection Failed:", error);
        throw new Error(`Failed to connect to Local LLM at ${currentSettings.ollamaBaseUrl}. Ensure Ollama is running and the model '${currentSettings.ollamaModel}' is pulled.`);
    }
};


// --- GENERATION FUNCTIONS ---

export const generateRequirementsFromSuite = async (suiteId: string): Promise<string> => {
    const suiteData = MOCK_DB[suiteId];
    if (!suiteData || suiteData.testCases.length === 0) {
        return "The selected test suite is currently empty. Please add test cases or select a different suite to generate requirements.";
    }

    const contextString = suiteData.testCases.map(tc =>
        `ID: ${tc.id}\nTitle: ${tc.title}\nSteps: ${tc.steps.join('; ')}\nExpected Result: ${tc.expectedResult}`
    ).join('\n---\n');

    const prompt = `You are an expert Senior Product Manager. Your task is to analyze a list of detailed software test cases and reverse-engineer the high-level functional requirements they represent.
    
Distill the essence of the tests into a concise, clear set of user-centric requirements. Use markdown formatting (e.g., headings, bullet points) for readability.

--- EXISTING TEST CASES ---
${contextString}
--- END OF EXISTING TEST CASES ---

Based on the test cases provided, what are the core requirements of this feature or application?`;

    try {
        if (currentSettings.provider === LLMProvider.Ollama) {
             return await generateWithOllama(prompt);
        } else {
            const ai = getGeminiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
            });
            return response.text;
        }
    } catch (error) {
        console.error("Error generating requirements:", error);
        throw new Error("Failed to generate requirements. " + (error instanceof Error ? error.message : ''));
    }
};


const createPrompt = (requirements: string, contextType: string, retrievedContext?: string | null): string => {
    let basePrompt = '';
    
    // Check if context exists and isn't just the "No existing test cases" message
    if (retrievedContext && !retrievedContext.startsWith("No existing")) {
        basePrompt = `You are an expert Senior QA Engineer performing a strict gap analysis.
Your task is to analyze new requirements against a set of existing test cases retrieved from our test suite.

OBJECTIVE: Generate ONLY test cases that cover functionality NOT present in the "RETRIEVED CONTEXT".

--- RETRIEVED CONTEXT (EXISTING TESTS) ---
${retrievedContext}
--- END OF RETRIEVED CONTEXT ---

Now, analyze the following NEW ${contextType}.
--- NEW ${contextType} ---
${requirements}
--- END OF NEW ${contextType} ---

INSTRUCTIONS:
1.  **Strict Deduplication:** Do not generate test cases for scenarios that are already covered in the RETRIEVED CONTEXT. If a test case exists for "User Login", do not create another "Verify Login" unless it covers a completely new edge case.
2.  **Gap Analysis:** Focus exclusively on requirements not covered by the existing tests.
3.  **Consistency:** Ensure new test cases match the granularity and style of the RETRIEVED CONTEXT.
4.  **Return Empty:** If the new ${contextType} is already fully covered by the retrieved context, you MUST return an empty JSON array [].`;
    } else {
        basePrompt = `You are an expert Senior QA Engineer. Based on the following requirements, generate a comprehensive list of test cases. The requirements are: \n\n${requirements}`;
    }

    // For local LLM, we append the JSON instructions explicitly
    if (currentSettings.provider === LLMProvider.Ollama) {
        return `${basePrompt}\n\n${JSON_STRUCTURE_PROMPT}`;
    }
    
    return basePrompt;
};

export const generateTestCasesFromText = async (requirements: string, suiteId?: string | null): Promise<TestCase[]> => {
    let retrievedContext: string | null = null;
    if (suiteId) {
        retrievedContext = getRetrievedContext(suiteId);
    }
    const prompt = createPrompt(requirements, "REQUIREMENTS", retrievedContext);

    try {
        let jsonText = '';

        if (currentSettings.provider === LLMProvider.Ollama) {
            jsonText = await generateWithOllama(prompt);
        } else {
            const ai = getGeminiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: testCasesSchema,
                }
            });
            jsonText = response.text;
        }

        jsonText = jsonText.trim();
        if (jsonText === "" || jsonText === "[]") return [];
        
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
        }
        if (jsonText.startsWith('```')) {
             jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
        }

        const parsedCases: TestCase[] = JSON.parse(jsonText);
        let finalCases = parsedCases;

        // Post-processing deduplication
        if (suiteId && MOCK_DB[suiteId]) {
            const existingCases = MOCK_DB[suiteId].testCases;
            if (existingCases.length > 0) {
                finalCases = parsedCases.filter(tc => !isDuplicate(tc, existingCases));
                if (parsedCases.length !== finalCases.length) {
                    console.log(`Deduplicated ${parsedCases.length - finalCases.length} test cases.`);
                }
            }
        }

        return finalCases;
    } catch (error) {
        console.error("Error generating test cases from text:", error);
        throw new Error("Failed to generate/parse test cases. " + (error instanceof Error ? error.message : ''));
    }
};

export const generateTestCasesFromScreenshot = async (image: { data: string; mimeType: string }, suiteId?: string | null): Promise<TestCase[]> => {
    let retrievedContext: string | null = null;
    if (suiteId) {
        retrievedContext = getRetrievedContext(suiteId);
    }
    
    const textPrompt = createPrompt("Analyze the following screenshot of a user interface. Based on the visible UI elements and their potential functionality, generate test cases.", "UI SCREENSHOT", retrievedContext);

    try {
        let jsonText = '';

        if (currentSettings.provider === LLMProvider.Ollama) {
            jsonText = await generateWithOllama(textPrompt, [image.data]);
        } else {
            const ai = getGeminiClient();
            const imagePart = {
                inlineData: { data: image.data, mimeType: image.mimeType },
            };
            const textPart = { text: textPrompt };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [textPart, imagePart] },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: testCasesSchema,
                }
            });
            jsonText = response.text;
        }
        
        jsonText = jsonText.trim();
        if (jsonText === "" || jsonText === "[]") return [];

        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
        }
        if (jsonText.startsWith('```')) {
             jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
        }

        const parsedCases: TestCase[] = JSON.parse(jsonText);
        let finalCases = parsedCases;

        // Post-processing deduplication
        if (suiteId && MOCK_DB[suiteId]) {
            const existingCases = MOCK_DB[suiteId].testCases;
            if (existingCases.length > 0) {
                finalCases = parsedCases.filter(tc => !isDuplicate(tc, existingCases));
                if (parsedCases.length !== finalCases.length) {
                    console.log(`Deduplicated ${parsedCases.length - finalCases.length} test cases.`);
                }
            }
        }

        return finalCases;
    } catch (error) {
        console.error("Error generating test cases from screenshot:", error);
        throw new Error("Failed to generate/parse test cases. " + (error instanceof Error ? error.message : ''));
    }
};
