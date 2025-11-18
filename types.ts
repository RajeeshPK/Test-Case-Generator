
export interface TestCase {
  id: string;
  title: string;
  steps: string[];
  expectedResult: string;
}

export enum InputMode {
  Text = 'text',
  Screenshot = 'screenshot',
}

export enum LLMProvider {
  Gemini = 'gemini',
  Ollama = 'ollama',
}

export interface AppSettings {
  provider: LLMProvider;
  ollamaBaseUrl: string;
  ollamaModel: string;
  geminiApiKey: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  provider: LLMProvider.Gemini,
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModel: 'gemma2:9b', // Suggesting Google's Gemma 2 for local use
  geminiApiKey: '',
};
