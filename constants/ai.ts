// OpenAI model for AI assistant
export const AI_MODEL = 'gpt-4o-mini';

// Maximum conversation turns to pass as context
export const MAX_HISTORY_MESSAGES = 20;

// Suggested prompts shown in the AI chat interface
export const SUGGESTED_PROMPTS = [
  'Which tasks have the highest automation potential?',
  'What is the recoverable cost for the Engineering department?',
  'Show anomalies detected in Week 3',
  'Compare the top performer to their role peers',
  'Why did automation rate change between weeks?',
  'Which employees have the highest recoverable hours?',
  'What are the most common apps used across departments?',
] as const;

// Citation regex pattern
export const CITATION_REGEX = /\[cite:\s*([^\]]+)\]/g;
