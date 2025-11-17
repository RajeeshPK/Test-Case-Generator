import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { InputSection } from './components/InputSection';
import { TestCaseDisplay } from './components/TestCaseDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { 
  generateTestCasesFromText, 
  generateTestCasesFromScreenshot,
  generateRequirementsFromSuite 
} from './services/geminiService';
import { TestCase, InputMode } from './types';

const App: React.FC = () => {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'success' | 'no_new_cases_needed'>('idle');
  
  const [text, setText] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const handleGenerate = useCallback(async (mode: InputMode, data: string | File, suiteId: string | null) => {
    setIsLoading(true);
    setError(null);
    setTestCases([]);
    setGenerationStatus('idle');

    try {
      console.log(`Generating with mode: ${mode}, suiteId: ${suiteId}`);

      let result: TestCase[] = [];
      if (mode === InputMode.Text) {
         if (!text.trim()) {
            setError("Requirements text cannot be empty.");
            setIsLoading(false);
            return;
        }
        result = await generateTestCasesFromText(text, suiteId);
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
        result = await generateTestCasesFromScreenshot(imageData, suiteId);
      }
      setTestCases(result);
      if (result.length === 0 && suiteId) {
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
  }, [text]);
  
  const handleAnalyzeSuite = useCallback(async (suiteId: string | null) => {
    if (!suiteId) return;
    setIsAnalyzing(true);
    setError(null);
    setText(''); // Clear existing text
    setTestCases([]); // Clear generated test cases
    setGenerationStatus('idle');

    try {
        const requirements = await generateRequirementsFromSuite(suiteId);
        setText(requirements);
    } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred during analysis.');
    } finally {
        setIsAnalyzing(false);
    }
  }, []);

  const showTestCaseDisplay = !isLoading && !error && generationStatus === 'success' && testCases.length > 0;
  const showInitialState = !isLoading && !error && generationStatus === 'idle';


  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <InputSection 
            onGenerate={handleGenerate} 
            isLoading={isLoading}
            text={text}
            onTextChange={setText}
            isAnalyzing={isAnalyzing}
            onAnalyzeSuite={handleAnalyzeSuite} 
          />
          
          <div className="mt-12">
            {isLoading && <LoadingSpinner />}
            {error && (
               <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center">
                 <p className="font-bold">Action Failed</p>
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
                        Good news! Based on the selected test suite, your requirements appear to be fully covered. No new test cases were needed.
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