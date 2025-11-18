
import React, { useState, useEffect } from 'react';
import { AppSettings, LLMProvider, DEFAULT_SETTINGS } from '../types';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentSettings: AppSettings;
    onSave: (settings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, currentSettings, onSave }) => {
    const [settings, setSettings] = useState<AppSettings>(currentSettings);

    // Sync state when modal opens or props change
    useEffect(() => {
        setSettings(currentSettings);
    }, [currentSettings, isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(settings);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <div className="flex justify-between items-center p-5 border-b border-gray-700 bg-gray-800">
                    <h2 className="text-xl font-bold text-white">AI Provider Settings</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Provider Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">AI Provider</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setSettings({ ...settings, provider: LLMProvider.Gemini })}
                                className={`flex items-center justify-center px-4 py-3 border rounded-lg text-sm font-medium transition-all ${
                                    settings.provider === LLMProvider.Gemini
                                        ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                                        : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:bg-gray-700'
                                }`}
                            >
                                Google Gemini (Cloud)
                            </button>
                            <button
                                onClick={() => setSettings({ ...settings, provider: LLMProvider.Ollama })}
                                className={`flex items-center justify-center px-4 py-3 border rounded-lg text-sm font-medium transition-all ${
                                    settings.provider === LLMProvider.Ollama
                                        ? 'bg-green-600/20 border-green-500 text-green-400'
                                        : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:bg-gray-700'
                                }`}
                            >
                                Local LLM (Ollama)
                            </button>
                        </div>
                    </div>

                    {/* Dynamic Settings Form */}
                    {settings.provider === LLMProvider.Gemini ? (
                        <div className="space-y-4 animate-fadeIn">
                            <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
                                <p className="text-sm text-blue-200">
                                    Using <strong>Google Gemini Pro 2.5</strong> via Google Cloud.
                                </p>
                            </div>
                            <div>
                                <label htmlFor="gemini-key" className="block text-sm font-medium text-gray-300 mb-1">
                                    API Key <span className="text-gray-500 font-normal">(Optional if set in env)</span>
                                </label>
                                <input
                                    type="password"
                                    id="gemini-key"
                                    value={settings.geminiApiKey || ''}
                                    onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
                                    placeholder="AIzaSy..."
                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-500"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Leave blank to use system environment variable.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fadeIn">
                             <div className="p-3 bg-green-900/20 border border-green-800 rounded-lg">
                                <p className="text-xs text-green-200">
                                    <strong>Tip:</strong> We recommend using <code>gemma2:9b</code> for logic or <code>llava</code> for screenshots. Ensure <a href="https://ollama.com/" target="_blank" className="underline hover:text-white">Ollama</a> is running.
                                </p>
                            </div>

                            <div>
                                <label htmlFor="ollama-url" className="block text-sm font-medium text-gray-300 mb-1">
                                    Ollama Endpoint URL
                                </label>
                                <input
                                    type="text"
                                    id="ollama-url"
                                    value={settings.ollamaBaseUrl}
                                    onChange={(e) => setSettings({ ...settings, ollamaBaseUrl: e.target.value })}
                                    placeholder="http://localhost:11434"
                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-white placeholder-gray-500"
                                />
                            </div>

                            <div>
                                <label htmlFor="ollama-model" className="block text-sm font-medium text-gray-300 mb-1">
                                    Model Name
                                </label>
                                <input
                                    type="text"
                                    id="ollama-model"
                                    value={settings.ollamaModel}
                                    onChange={(e) => setSettings({ ...settings, ollamaModel: e.target.value })}
                                    placeholder="gemma2:9b"
                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-white placeholder-gray-500"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Make sure to run <code>ollama pull {settings.ollamaModel || 'gemma2:9b'}</code> first.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-5 border-t border-gray-700 bg-gray-800 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                            settings.provider === LLMProvider.Gemini 
                                ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' 
                                : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                        }`}
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};
