'use client';
import { useRef, useEffect, useState, type KeyboardEvent } from 'react';
import type { AnalyticsOutput } from '../../types/analytics';
import type { Citation } from '../../types/chat';
import { useAIChat } from '../../hooks/useAIChat';
import MessageBubble from './MessageBubble';
import SuggestedPrompts from './SuggestedPrompts';
import { Send, Trash2, StopCircle, AlertCircle } from 'lucide-react';

interface ChatInterfaceProps {
  analytics: AnalyticsOutput | null;
}

export default function ChatInterface({ analytics }: ChatInterfaceProps) {
  const { messages, isLoading, error, sendMessage, clearHistory, stopStreaming } = useAIChat(analytics);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    sendMessage(trimmed);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
  }

  function handleCitationClick(_citation: Citation) {
    // Could highlight relevant chart — for now just log
    console.info('Citation clicked:', _citation);
  }

  const noApiKey = !analytics;

  return (
    <div className="chat-container card" id="chat-container">
      {/* Header bar */}
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>AI</div>
          <div>
            <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>Workforce Pulse AI</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Grounded in your dataset · Citations required</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {messages.length > 0 && (
            <button className="btn btn-ghost btn-icon" onClick={clearHistory} title="Clear conversation" id="clear-chat-btn">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-8)' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 700, color: 'white', boxShadow: 'var(--shadow-glow)' }}>AI</div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--color-text-primary)', marginBottom: 'var(--space-2)' }}>Ask anything about your workforce data</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.6, maxWidth: 400 }}>
                Every answer is grounded exclusively in your provided dataset.
                All quantitative claims include data citations with row counts, aggregation methods, and confidence levels.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onCitationClick={handleCitationClick} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="chat-input-area">
        {messages.length === 0 && (
          <SuggestedPrompts onSelect={(p) => { setInput(p); textareaRef.current?.focus(); }} disabled={isLoading} />
        )}

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-3)', background: 'var(--color-danger-dim)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-3)', fontSize: '0.8rem', color: 'var(--color-danger)' }}>
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {noApiKey && (
          <div style={{ padding: 'var(--space-3)', background: 'var(--color-accent-dim)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-3)', fontSize: '0.8rem', color: 'var(--color-accent)' }}>
            ⚠ Dataset not yet loaded. Please place files in <code>public/data/</code> and reload.
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about automation opportunities, recoverable costs, anomalies, or employee performance…"
            disabled={isLoading || noApiKey}
            rows={1}
            id="chat-input"
            style={{
              flex: 1,
              resize: 'none',
              minHeight: 44,
              maxHeight: 140,
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-primary)',
              padding: '10px var(--space-4)',
              fontSize: '0.9rem',
              fontFamily: 'inherit',
              outline: 'none',
              lineHeight: 1.5,
              transition: 'border-color var(--transition-fast)',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--color-border-subtle)'; }}
          />
          {isLoading ? (
            <button className="btn btn-ghost btn-icon" onClick={stopStreaming} title="Stop generating" id="stop-streaming-btn">
              <StopCircle size={18} color="var(--color-danger)" />
            </button>
          ) : (
            <button
              className="btn btn-primary btn-icon"
              onClick={handleSubmit}
              disabled={!input.trim() || noApiKey}
              title="Send message (Enter)"
              id="send-message-btn"
            >
              <Send size={16} />
            </button>
          )}
        </div>
        <p style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)', textAlign: 'center' }}>
          Press Enter to send · Shift+Enter for new line · Powered by GPT-4o-mini
        </p>
      </div>
    </div>
  );
}
