
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

  const handleGenerate = useCallback(async (mode: InputMode, data: string | File, styleFile: File | null) => {
    setIsLoading(true);
    setError(null);
    setTestCases([]);

    try {
      let styleGuideContent: string | undefined = undefined;
      if (styleFile) {
        if (styleFile.name.toLowerCase().endsWith('.xlsx')) {
          const arrayBuffer = await styleFile.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: 'buffer' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);
          
          styleGuideContent = jsonData.map(row => {
              return `ID: ${row['Test Case ID'] || 'N/A'}\nTitle: ${row['Title'] || 'N/A'}\nSteps: ${row['Steps'] || 'N/A'}\nExpected Result: ${row['Expected Result'] || 'N/A'}`;
          }).join('\n\n---\n\n');
        } else {
          styleGuideContent = await styleFile.text();
        }
      }

      let result: TestCase[] = [];
      if (mode === InputMode.Text && typeof data === 'string') {
        result = await generateTestCasesFromText(data, styleGuideContent);
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
        result = await generateTestCasesFromScreenshot(imageData, styleGuideContent);
      }
      setTestCases(result);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred. Please check the console.');
    } finally {
      setIsLoading(false);
    }
  }, []);

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
            {!isLoading && !error && (
              <TestCaseDisplay testCases={testCases} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
