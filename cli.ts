import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import * as XLSX from 'xlsx';
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
        return "No new test cases were generated.";
    }
    return testCases.map(tc => `
## ${tc.id}: ${tc.title}

**Steps to Reproduce:**
${tc.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

**Expected Result:**
${tc.expectedResult}
    `).join('\n\n' + '-'.repeat(40) + '\n');
};

const writeToExcel = (testCases: TestCase[], filePath: string): void => {
    if (!filePath.toLowerCase().endsWith('.xlsx')) {
        console.error("Error: Output file must have an .xlsx extension.");
        process.exit(1);
    }
    
    console.log(`\nWriting to Excel file: ${filePath}...`);
    
    const worksheetData = testCases.map(tc => ({
      'Test Case ID': tc.id,
      'Title': tc.title,
      'Steps': tc.steps.map((step, i) => `${i + 1}. ${step}`).join('\n'),
      'Expected Result': tc.expectedResult
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    
    worksheet['!cols'] = [
      { wch: 15 }, // Test Case ID
      { wch: 50 }, // Title
      { wch: 70 }, // Steps
      { wch: 70 }, // Expected Result
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Cases');

    XLSX.writeFile(workbook, filePath);
    console.log(`✅ Successfully saved to ${filePath}`);
};


const main = async () => {
    let args = process.argv.slice(2);

    const outFlagIndex = args.indexOf('--out');
    let outputFile: string | null = null;
    if (outFlagIndex > -1) {
        if (outFlagIndex + 1 >= args.length) {
            console.error("Error: --out flag requires a filename.");
            process.exit(1);
        }
        outputFile = args[outFlagIndex + 1];
        args.splice(outFlagIndex, 2);
    }

    const suiteIdFlagIndex = args.indexOf('--suite-id');
    let suiteId: string | null = null;
    if (suiteIdFlagIndex > -1) {
        if (suiteIdFlagIndex + 1 >= args.length) {
            console.error("Error: --suite-id flag requires an identifier (e.g., 'project-apollo').");
            process.exit(1);
        }
        suiteId = args[suiteIdFlagIndex + 1];
        args.splice(suiteIdFlagIndex, 2);
    }


    if (args.length < 2) {
        console.error('Usage:');
        console.error('  ts-node cli.ts text "<requirements>" [--suite-id <suite-identifier>] [--out <filename.xlsx>]');
        console.error('  ts-node cli.ts screenshot <path/to/image.png> [--suite-id <suite-identifier>] [--out <filename.xlsx>]');
        console.error('\nNote: The --suite-id refers to a test suite managed by the RAG backend.');
        process.exit(1);
    }

    const [mode, ...inputParts] = args;
    const input = inputParts.join(' ');

    console.log('---------------------------------');
    console.log('🤖 AI Test Case Generator (CLI)');
    console.log('---------------------------------');

    try {
        if (suiteId) {
            console.log(`\n📄 Using indexed test suite for context: ${suiteId}`);
        }

        let testCases: TestCase[] = [];
        console.log(`\n⏳ Generating new test cases for mode: ${mode}...`);

        if (mode === 'text') {
            if (!input) {
                console.error("Error: Text requirements cannot be empty.");
                process.exit(1);
            }
            testCases = await generateTestCasesFromText(input, suiteId);
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

            testCases = await generateTestCasesFromScreenshot({ data: base64Data, mimeType }, suiteId);
        } else {
            console.error(`❌ Unknown mode: "${mode}". Use 'text' or 'screenshot'.`);
            process.exit(1);
        }

        if (testCases.length === 0 && suiteId) {
            console.log('\n✅ Coverage Analysis Complete!');
            console.log(`Based on the context from suite '${suiteId}', your requirements appear to be fully covered.`);
        } else {
            console.log('\n✅ Generation Complete!');
            if (outputFile) {
                writeToExcel(testCases, outputFile);
            } else {
                console.log('\n--- Generated Test Cases ---');
                console.log(formatTestCases(testCases));
            }
        }

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
