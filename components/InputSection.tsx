
import React, { useState, useCallback } from 'react';
import { InputMode } from '../types';
import { TextIcon } from './icons/TextIcon';
import { ImageIcon } from './icons/ImageIcon';

interface InputSectionProps {
  onGenerate: (mode: InputMode, data: string | File) => void;
  isLoading: boolean;
}

export const InputSection: React.FC<InputSectionProps> = ({ onGenerate, isLoading }) => {
  const [mode, setMode] = useState<InputMode>(InputMode.Text);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

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

  const handleGenerateClick = useCallback(() => {
    if (isLoading) return;

    if (mode === InputMode.Text && text.trim()) {
      onGenerate(InputMode.Text, text);
    } else if (mode === InputMode.Screenshot && file) {
      onGenerate(InputMode.Screenshot, file);
    }
  }, [mode, text, file, isLoading, onGenerate]);
  
  const isGenerateDisabled = isLoading || (mode === InputMode.Text && !text.trim()) || (mode === InputMode.Screenshot && !file);

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
            disabled={isLoading}
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
              <input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} accept="image/*" disabled={isLoading} />
            </label>
          </div>
        )}
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
