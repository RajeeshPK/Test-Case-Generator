import fs from 'fs/promises';
import path from 'path';
// Fix: Import `process` to provide types for `process.argv` and `process.exit`.
import process from 'process';
import { generateTestCasesFromText, generateTestCasesFromScreenshot } from './services/geminiService';
import { TestCase } from './types';

/* eslint-disable no-console */

const getMimeType = (filePath: string): string => {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.png':
            return 'image/png';
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg';
        case '.gif':
            return 'image/gif';
        default:
            throw new Error(`Unsupported file type: ${ext}. Please use PNG, JPG, or GIF.`);
    }
};

const formatTestCases = (testCases: TestCase[]): string => {
    if (!testCases || testCases.length === 0) {
        return "No test cases were generated.";
    }
    return testCases.map(tc => `
## ${tc.id}: ${tc.title}

**Steps to Reproduce:**
${tc.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

**Expected Result:**
${tc.expectedResult}
    `).join('\n\n' + '-'.repeat(40) + '\n');
};


const main = async () => {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.error('Usage:');
        console.error('  ts-node cli.ts text "<requirements>"');
        console.error('  ts-node cli.ts screenshot <path/to/image.png>');
        process.exit(1);
    }

    const [mode, ...inputParts] = args;
    const input = inputParts.join(' ');

    console.log('---------------------------------');
    console.log('🤖 AI Test Case Generator (CLI)');
    console.log('---------------------------------');

    try {
        let testCases: TestCase[] = [];
        console.log(`\n⏳ Generating test cases for mode: ${mode}...`);

        if (mode === 'text') {
            if (!input) {
                console.error("Error: Text requirements cannot be empty.");
                process.exit(1);
            }
            testCases = await generateTestCasesFromText(input);
        } else if (mode === 'screenshot') {
            const filePath = input;
            try {
                await fs.access(filePath);
            } catch (e) {
                console.error(`Error: File not found at ${filePath}`);
                process.exit(1);
            }
            const fileBuffer = await fs.readFile(filePath);
            const base64Data = fileBuffer.toString('base64');
            const mimeType = getMimeType(filePath);

            testCases = await generateTestCasesFromScreenshot({ data: base64Data, mimeType });
        } else {
            console.error(`❌ Unknown mode: "${mode}". Use 'text' or 'screenshot'.`);
            process.exit(1);
        }

        console.log('\n✅ Generation Complete!');
        console.log('\n--- Generated Test Cases ---');
        console.log(formatTestCases(testCases));

    } catch (error) {
        console.error('\n❌ An Error Occurred During Generation');
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error('An unknown error occurred. Please check your API key and input.');
        }
        process.exit(1);
    }
};

main();
