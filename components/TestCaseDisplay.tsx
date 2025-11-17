
import React from 'react';
import { TestCase } from '../types';

interface TestCaseDisplayProps {
  testCases: TestCase[];
}

export const TestCaseDisplay: React.FC<TestCaseDisplayProps> = ({ testCases }) => {
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
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
        <h3 className="mt-2 text-lg font-medium text-gray-300">No test cases generated yet</h3>
        <p className="mt-1 text-sm text-gray-500">
          Enter your requirements or upload a screenshot to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-200">Generated Test Cases</h2>
      {testCases.map((tc, index) => (
        <div key={index} className="bg-gray-800/60 rounded-lg shadow-lg overflow-hidden border border-gray-700 transition-transform duration-300 hover:border-blue-600/50 hover:scale-[1.02]">
          <div className="p-5">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-blue-400">{tc.title}</h3>
              <span className="text-xs font-mono bg-gray-700 text-gray-300 px-2 py-1 rounded-full">{tc.id}</span>
            </div>

            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Steps to Reproduce:</h4>
              <ol className="list-decimal list-inside space-y-1 text-gray-400 text-sm pl-2">
                {tc.steps.map((step, stepIndex) => (
                  <li key={stepIndex}>{step}</li>
                ))}
              </ol>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-700">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Expected Result:</h4>
                <p className="text-gray-300 text-sm bg-gray-900/50 p-3 rounded-md">{tc.expectedResult}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
