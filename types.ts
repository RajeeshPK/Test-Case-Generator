
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
