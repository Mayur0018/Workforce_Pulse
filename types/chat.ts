// Parsed citation from AI response
export interface Citation {
  id: string; // unique per message
  rows?: number;
  task?: string;
  employee?: string;
  dept?: string;
  date_range?: string;
  aggregation?: string;
  confidence?: 'high' | 'medium' | 'low';
  raw: string; // original [cite: ...] string
}

// A single chat message
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string; // full content including [cite: ...] blocks
  cleaned_content?: string; // content with citations stripped out for display
  citations?: Citation[];
  timestamp: Date;
  isStreaming?: boolean;
}

// Chat session stored in sessionStorage
export interface ChatSession {
  messages: ChatMessage[];
  created_at: string;
}
