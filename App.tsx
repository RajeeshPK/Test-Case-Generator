import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Header } from './components/Header';
import { InputSection } from './components/InputSection';
import { TestCaseDisplay } from './components/TestCaseDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { generateTestCasesFromText, generateTestCasesFromScreenshot } from './services/geminiService';
import { TestCase, InputMode } from './types';

const App: React.FC = () => {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'success' | 'no_new_cases_needed'>('idle');

  const handleGenerate = useCallback(async (mode: InputMode, data: string | File, contextFile: File | null) => {
    setIsLoading(true);
    setError(null);
    setTestCases([]);
    setGenerationStatus('idle');

    try {
      let existingTestsContext: string | undefined = undefined;
      if (contextFile) {
        if (contextFile.name.toLowerCase().endsWith('.xlsx')) {
          const arrayBuffer = await contextFile.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: 'buffer' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);
          
          existingTestsContext = jsonData.map(row => {
              // Note: Using a flexible set of potential column names
              const id = row['Test Case ID'] || row['ID'] || 'N/A';
              const title = row['Title'] || row['Summary'] || 'N/A';
              const steps = row['Steps'] || row['Reproduction Steps'] || 'N/A';
              const expected = row['Expected Result'] || row['Expected'] || 'N/A';
              return `ID: ${id}\nTitle: ${title}\nSteps: ${steps}\nExpected Result: ${expected}`;
          }).join('\n\n---\n\n');
        } else {
          existingTestsContext = await contextFile.text();
        }
      }

      let result: TestCase[] = [];
      if (mode === InputMode.Text && typeof data === 'string') {
        result = await generateTestCasesFromText(data, existingTestsContext);
      } else if (mode === InputMode.Screenshot && data instanceof File) {
        const imageData = await new Promise<{ data: string; mimeType: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              resolve({ data: reader.result.split(',')[1], mimeType: data.type });
            } else {
              reject(new Error("Failed to read file as data URL."));
            }
          };
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(data);
        });
        result = await generateTestCasesFromScreenshot(imageData, existingTestsContext);
      }
      setTestCases(result);
      if (result.length === 0 && contextFile) {
        setGenerationStatus('no_new_cases_needed');
      } else {
        setGenerationStatus('success');
      }

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred. Please check the console.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const showTestCaseDisplay = !isLoading && !error && generationStatus === 'success' && testCases.length > 0;
  const showInitialState = !isLoading && !error && generationStatus === 'idle';


  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <InputSection onGenerate={handleGenerate} isLoading={isLoading} />
          
          <div className="mt-12">
            {isLoading && <LoadingSpinner />}
            {error && (
               <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center">
                 <p className="font-bold">Generation Failed</p>
                 <p className="text-sm">{error}</p>
               </div>
            )}
            
            {generationStatus === 'no_new_cases_needed' && (
                <div className="text-center py-16 px-6 bg-green-900/30 border border-dashed border-green-700 rounded-xl">
                    <svg className="mx-auto h-12 w-12 text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-white">Coverage Analysis Complete</h3>
                    <p className="mt-1 text-sm text-green-300">
                        Good news! Your existing test suite appears to fully cover the provided requirements. No new test cases were needed.
                    </p>
                </div>
            )}

            {(showTestCaseDisplay || showInitialState) && (
              <TestCaseDisplay testCases={testCases} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
