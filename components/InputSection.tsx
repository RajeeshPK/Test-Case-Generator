import React, { useState, useCallback, useRef } from 'react';
import { InputMode } from '../types';
import { TextIcon } from './icons/TextIcon';
import { ImageIcon } from './icons/ImageIcon';
import { registerNewSuite } from '../services/geminiService';


interface InputSectionProps {
  onGenerate: (mode: InputMode, data: string | File, suiteId: string | null) => void;
  isLoading: boolean;
}

// In a real app, this would be fetched from the backend.
const INITIAL_SUITES = [
    { id: 'suite-proj-apollo', name: 'Project Apollo - Core Features' },
    { id: 'suite-proj-gemini', name: 'Project Gemini - User Authentication' },
    { id: 'suite-proj-voyager', name: 'Project Voyager - Reporting Module' },
];

export const InputSection: React.FC<InputSectionProps> = ({ onGenerate, isLoading }) => {
  const [mode, setMode] = useState<InputMode>(InputMode.Text);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  
  const [suites, setSuites] = useState(INITIAL_SUITES);
  const [selectedSuiteId, setSelectedSuiteId] = useState<string | null>(INITIAL_SUITES[0].id);
  
  const [isIndexing, setIsIndexing] = useState<boolean>(false);
  const [isCreatingSuite, setIsCreatingSuite] = useState<boolean>(false);
  const [newSuiteName, setNewSuiteName] = useState('');

  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleIndexSuite = (e: React.ChangeEvent<HTMLInputElement>) => {
      const suiteFile = e.target.files?.[0];
      if (suiteFile) {
          setIsIndexing(true);
          // In a real RAG application, you would upload this file to your backend
          // for processing and indexing into a vector database.
          console.log(`Uploading '${suiteFile.name}' for indexing...`);
          // We simulate the indexing process with a timeout.
          setTimeout(() => {
              console.log("Indexing complete!");
              setIsIndexing(false);
              // You might refresh the list of suites from the backend here.
          }, 3000); // Simulate a 3-second indexing job
      }
  }
  
  const handleSaveNewSuite = () => {
    if (!newSuiteName.trim()) return;

    const newSuiteId = `suite-custom-${Date.now()}`;
    const newSuite = { id: newSuiteId, name: newSuiteName.trim() };

    // 1. Update component state
    setSuites(prevSuites => [...prevSuites, newSuite]);
    setSelectedSuiteId(newSuiteId);

    // 2. "Inform" the backend by calling the service
    registerNewSuite(newSuiteId);
    
    // 3. Reset UI
    setNewSuiteName('');
    setIsCreatingSuite(false);
  };


  const handleGenerateClick = useCallback(() => {
    if (isLoading || isIndexing || isCreatingSuite) return;

    if (mode === InputMode.Text && text.trim()) {
      onGenerate(InputMode.Text, text, selectedSuiteId);
    } else if (mode === InputMode.Screenshot && file) {
      onGenerate(InputMode.Screenshot, file, selectedSuiteId);
    }
  }, [mode, text, file, selectedSuiteId, isLoading, isIndexing, isCreatingSuite, onGenerate]);
  
  const isGenerateDisabled = isLoading || isIndexing || isCreatingSuite || (mode === InputMode.Text && !text.trim()) || (mode === InputMode.Screenshot && !file);

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 shadow-lg p-6 backdrop-blur-sm">
      <div className="flex border-b border-gray-700 mb-6">
        <TabButton
          icon={<TextIcon />}
          label="Text Requirements"
          isActive={mode === InputMode.Text}
          onClick={() => setMode(InputMode.Text)}
        />
        <TabButton
          icon={<ImageIcon />}
          label="Screenshot"
          isActive={mode === InputMode.Screenshot}
          onClick={() => setMode(InputMode.Screenshot)}
        />
      </div>

      <div>
        {mode === InputMode.Text ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your feature requirements, user stories, or acceptance criteria here..."
            className="w-full h-48 p-4 bg-gray-900/70 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 resize-y"
            disabled={isLoading || isIndexing || isCreatingSuite}
          />
        ) : (
          <div className="flex flex-col items-center justify-center w-full">
            <label
              htmlFor="dropzone-file"
              className={`flex flex-col items-center justify-center w-full h-64 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-900/70 hover:bg-gray-800/80 transition-colors ${preview ? 'p-2' : 'p-5'}`}
            >
              {preview ? (
                <img src={preview} alt="Screenshot preview" className="max-h-full max-w-full object-contain rounded-md" />
              ) : (
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-gray-400">
                  <svg className="w-8 h-8 mb-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>
                  <p className="mb-2 text-sm"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                  <p className="text-xs">PNG, JPG or GIF</p>
                </div>
              )}
              <input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} accept="image/*" disabled={isLoading || isIndexing || isCreatingSuite} />
            </label>
          </div>
        )}
      </div>
      
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
            <div className="flex justify-between items-center mb-2">
                <label htmlFor="suite-select" className="block text-sm font-medium text-gray-300">
                    Select Contextual Test Suite
                </label>
                <button 
                    onClick={() => setIsCreatingSuite(true)}
                    disabled={isLoading || isIndexing || isCreatingSuite}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    + New
                </button>
            </div>
            <select 
                id="suite-select" 
                value={selectedSuiteId ?? ''}
                onChange={(e) => setSelectedSuiteId(e.target.value)}
                className="bg-gray-900/70 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                disabled={isLoading || isIndexing || isCreatingSuite}
            >
                {suites.map(suite => (
                    <option key={suite.id} value={suite.id}>{suite.name}</option>
                ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">The AI will use this suite for context and style matching.</p>

            {isCreatingSuite && (
                <div className="mt-3 bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                    <input
                        type="text"
                        value={newSuiteName}
                        onChange={(e) => setNewSuiteName(e.target.value)}
                        placeholder="Enter new suite name"
                        className="bg-gray-800 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                        autoFocus
                    />
                    <div className="flex justify-end space-x-2 mt-2">
                        <button onClick={() => setIsCreatingSuite(false)} className="px-3 py-1 text-xs font-medium text-gray-300 rounded-md hover:bg-gray-700">Cancel</button>
                        <button onClick={handleSaveNewSuite} className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-600" disabled={!newSuiteName.trim()}>Save</button>
                    </div>
                </div>
            )}
        </div>
        <div>
            <label htmlFor="index-file-input" className="block mb-2 text-sm font-medium text-gray-300">
                {isIndexing ? 'Indexing New Suite...' : 'Index an Existing Suite'}
            </label>
             <div className="relative">
                <input 
                    className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-900/50 file:text-blue-300 hover:file:bg-blue-800/50 cursor-pointer border border-gray-600 rounded-lg bg-gray-900/70 focus:outline-none pr-10 disabled:opacity-50" 
                    id="index-file-input" 
                    type="file"
                    onChange={handleIndexSuite}
                    accept=".txt,.md,.xlsx"
                    disabled={isLoading || isIndexing || isCreatingSuite}
                />
                 {isIndexing && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                         <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
            </div>
             <p className="mt-1 text-xs text-gray-500">Upload a large suite to make it available for selection.</p>
        </div>
    </div>


      <div className="mt-6 flex justify-end">
        <button
          onClick={handleGenerateClick}
          disabled={isGenerateDisabled}
          className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200 transform hover:scale-105 disabled:scale-100 flex items-center space-x-2"
        >
          <span>Generate Test Cases</span>
           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};

interface TabButtonProps {
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-colors duration-200 focus:outline-none ${
        isActive
            ? 'border-b-2 border-blue-500 text-blue-400'
            : 'text-gray-400 hover:text-white'
        }`}
    >
        {icon}
        <span>{label}</span>
    </button>
);