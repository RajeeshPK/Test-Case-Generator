import React from 'react';
import * as XLSX from 'xlsx';
import { TestCase } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';

interface TestCaseDisplayProps {
  testCases: TestCase[];
}

export const TestCaseDisplay: React.FC<TestCaseDisplayProps> = ({ testCases }) => {
  const handleExport = () => {
    if (testCases.length === 0) return;

    const worksheetData = testCases.map(tc => ({
      'Test Case ID': tc.id,
      'Title': tc.title,
      'Steps': tc.steps.map((step, i) => `${i + 1}. ${step}`).join('\n'),
      'Expected Result': tc.expectedResult
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    
    // Set column widths for better readability
    worksheet['!cols'] = [
      { wch: 15 }, // Test Case ID
      { wch: 50 }, // Title
      { wch: 70 }, // Steps
      { wch: 70 }, // Expected Result
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Cases');

    XLSX.writeFile(workbook, 'Generated_Test_Cases.xlsx');
  };

  if (testCases.length === 0) {
    return (
      <div className="text-center py-16 px-6 bg-gray-800/30 border border-dashed border-gray-700 rounded-xl">
        <svg
          className="mx-auto h-12 w-12 text-gray-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-white">No test cases generated yet</h3>
        <p className="mt-1 text-sm text-gray-400">
          Use the form above to generate test cases from your requirements or a screenshot.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">Generated Test Cases</h2>
        <button
          onClick={handleExport}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition-all duration-200"
        >
          <DownloadIcon />
          <span>Export to Excel</span>
        </button>
      </div>
      <div className="space-y-4">
        {testCases.map((testCase) => (
          <div key={testCase.id} className="bg-gray-800/50 border border-gray-700 rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-gray-800 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-blue-400">
                <span className="font-mono bg-gray-900 px-2 py-1 rounded-md text-sm mr-2">{testCase.id}</span>
                {testCase.title}
              </h3>
            </div>
            <div className="p-6">
              <div>
                <h4 className="font-semibold text-gray-300 mb-2">Steps to Reproduce:</h4>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  {testCase.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-700/50">
                <h4 className="font-semibold text-gray-300 mb-2">Expected Result:</h4>
                <p className="text-gray-400">{testCase.expectedResult}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
