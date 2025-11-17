
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

    const styleFlagIndex = args.indexOf('--style');
    let styleGuideFile: string | null = null;
    if (styleFlagIndex > -1) {
        if (styleFlagIndex + 1 >= args.length) {
            console.error("Error: --style flag requires a filepath.");
            process.exit(1);
        }
        styleGuideFile = args[styleFlagIndex + 1];
        args.splice(styleFlagIndex, 2);
    }


    if (args.length < 2) {
        console.error('Usage:');
        console.error('  ts-node cli.ts text "<requirements>" [--style <path/to/guide.txt>] [--out <filename.xlsx>]');
        console.error('  ts-node cli.ts screenshot <path/to/image.png> [--style <path/to/guide.txt>] [--out <filename.xlsx>]');
        process.exit(1);
    }

    const [mode, ...inputParts] = args;
    const input = inputParts.join(' ');

    console.log('---------------------------------');
    console.log('🤖 AI Test Case Generator (CLI)');
    console.log('---------------------------------');

    try {
        let styleGuideContent: string | undefined = undefined;
        if (styleGuideFile) {
            console.log(`\n📄 Loading style guide from: ${styleGuideFile}`);
            try {
                await fs.access(styleGuideFile);
                if (styleGuideFile.toLowerCase().endsWith('.xlsx')) {
                    const fileBuffer = await fs.readFile(styleGuideFile);
                    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

                    styleGuideContent = jsonData.map(row => {
                        return `ID: ${row['Test Case ID'] || 'N/A'}\nTitle: ${row['Title'] || 'N/A'}\nSteps: ${row['Steps'] || 'N/A'}\nExpected Result: ${row['Expected Result'] || 'N/A'}`;
                    }).join('\n\n---\n\n');
                } else {
                    styleGuideContent = await fs.readFile(styleGuideFile, 'utf-8');
                }
            } catch (e) {
                console.error(`Error: Could not read style guide file at ${styleGuideFile}`);
                process.exit(1);
            }
        }

        let testCases: TestCase[] = [];
        console.log(`\n⏳ Generating test cases for mode: ${mode}...`);

        if (mode === 'text') {
            if (!input) {
                console.error("Error: Text requirements cannot be empty.");
                process.exit(1);
            }
            testCases = await generateTestCasesFromText(input, styleGuideContent);
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

            testCases = await generateTestCasesFromScreenshot({ data: base64Data, mimeType }, styleGuideContent);
        } else {
            console.error(`❌ Unknown mode: "${mode}". Use 'text' or 'screenshot'.`);
            process.exit(1);
        }

        console.log('\n✅ Generation Complete!');
        
        if (outputFile) {
            writeToExcel(testCases, outputFile);
        } else {
            console.log('\n--- Generated Test Cases ---');
            console.log(formatTestCases(testCases));
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
