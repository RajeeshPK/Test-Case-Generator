import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import * as XLSX from 'xlsx';
import { 
    generateTestCasesFromText, 
    generateTestCasesFromScreenshot,
    getSuites,
    registerNewSuite,
    deleteSuite,
} from './services/geminiService';
import { TestCase } from './types';

/* eslint-disable no-console */

// --- HELPER FUNCTIONS ---

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

const printHeader = () => {
    console.log('---------------------------------');
    console.log('🤖 AI Test Case Generator (CLI)');
    console.log('---------------------------------');
};

const printUsage = () => {
    console.error('Usage:');
    console.error('\n  --- Test Case Generation ---');
    console.error('  ts-node cli.ts text "<requirements>" [--suite-id <id>] [--out <file.xlsx>]');
    console.error('  ts-node cli.ts screenshot <path/to/image.png> [--suite-id <id>] [--out <file.xlsx>]');
    console.error('\n  --- Suite Management ---');
    console.error('  ts-node cli.ts --list-suites');
    console.error('  ts-node cli.ts --create-suite "<Suite Name>"');
    console.error('  ts-node cli.ts --delete-suite <suite-id>');
};

// --- CLI COMMAND HANDLERS ---

const handleListSuites = async () => {
    printHeader();
    console.log("\nListing available test suites...");
    const suites = await getSuites();
    if (suites.length === 0) {
        console.log("No test suites found.");
    } else {
        console.log("\nAvailable Suites:");
        suites.forEach(suite => {
            console.log(`  - Name: ${suite.name}`);
            console.log(`    ID:   ${suite.id}`);
        });
    }
};

const handleCreateSuite = async (suiteName: string | undefined) => {
    printHeader();
    if (!suiteName) {
        console.error("Error: --create-suite flag requires a name.");
        console.error('Example: ts-node cli.ts --create-suite "My New Suite"');
        process.exit(1);
    }
    console.log(`\nCreating new suite: "${suiteName}"...`);
    const newSuite = await registerNewSuite(suiteName);
    console.log(`\n✅ Suite created successfully!`);
    console.log(`  - Name: ${newSuite.name}`);
    console.log(`  - ID:   ${newSuite.id}`);
};

const handleDeleteSuite = async (suiteId: string | undefined) => {
    printHeader();
    if (!suiteId) {
        console.error("Error: --delete-suite flag requires a suite ID.");
        console.error('Example: ts-node cli.ts --delete-suite "suite-proj-apollo"');
        process.exit(1);
    }
    console.log(`\nDeleting suite with ID: "${suiteId}"...`);
    const success = await deleteSuite(suiteId);
    if (success) {
        console.log(`\n✅ Suite "${suiteId}" deleted successfully.`);
    } else {
        console.error(`\n❌ Error: Suite with ID "${suiteId}" not found.`);
        process.exit(1);
    }
};

const handleGeneration = async (args: string[]) => {
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
            console.error("Error: --suite-id flag requires an identifier.");
            process.exit(1);
        }
        suiteId = args[suiteIdFlagIndex + 1];
        args.splice(suiteIdFlagIndex, 2);
    }

    if (args.length < 2) {
        printUsage();
        process.exit(1);
    }

    const [mode, ...inputParts] = args;
    const input = inputParts.join(' ');

    printHeader();

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
};


// --- MAIN EXECUTION ---

const main = async () => {
    const args = process.argv.slice(2);

    try {
        // Standalone Suite Management Commands
        if (args.includes('--list-suites')) {
            await handleListSuites();
        } else if (args.includes('--create-suite')) {
            const suiteNameIndex = args.indexOf('--create-suite') + 1;
            await handleCreateSuite(args[suiteNameIndex]);
        } else if (args.includes('--delete-suite')) {
            const suiteIdIndex = args.indexOf('--delete-suite') + 1;
            await handleDeleteSuite(args[suiteIdIndex]);
        } 
        // Default to Generation
        else if (args.length > 0) {
            await handleGeneration(args);
        }
        // No arguments provided
        else {
            printUsage();
            process.exit(1);
        }
    } catch (error) {
        console.error('\n❌ An Error Occurred');
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error('An unknown error occurred. Please check your API key and input.');
        }
        process.exit(1);
    }
};

main();
