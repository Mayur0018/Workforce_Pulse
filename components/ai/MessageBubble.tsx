'use client';
import type { ChatMessage } from '../../types/chat';
import type { Citation } from '../../types/chat';
import CitationChip from './CitationChip';

interface MessageBubbleProps {
  message: ChatMessage;
  onCitationClick?: (citation: Citation) => void;
}

/** Replace [cite-123-0] placeholders with chip components */
function renderContentWithCitations(
  cleanedContent: string,
  citations: Citation[],
  onCitationClick?: (citation: Citation) => void
): React.ReactNode[] {
  const parts = cleanedContent.split(/(\[cite-\d+-\d+\])/g);
  return parts.map((part, i) => {
    if (part.startsWith('[cite-')) {
      const citation = citations.find((c) => c.id === part.slice(1, -1));
      if (citation) {
        return <CitationChip key={i} citation={citation} onClick={onCitationClick} />;
      }
    }
    return <span key={i}>{part}</span>;
  });
}

export default function MessageBubble({ message, onCitationClick }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  const content = isUser
    ? message.content
    : message.cleaned_content ?? message.content;

  const citations = message.citations ?? [];

  return (
    <div className={isUser ? 'message-user' : 'message-assistant'}>
      {/* Avatar row for assistant */}
      {!isUser && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
            AI
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
            Workforce Pulse AI
            {message.isStreaming && (
              <span style={{ marginLeft: 8, display: 'inline-flex', gap: 3 }}>
                <span className="pulse-glow" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-primary)', display: 'inline-block', animation: 'pulse-glow 1s ease-in-out infinite' }} />
              </span>
            )}
          </span>
        </div>
      )}

      {/* Content */}
      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {isUser
          ? content
          : renderContentWithCitations(content, citations, onCitationClick)
        }
      </div>

      {/* Citation chips row */}
      {!isUser && citations.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 'var(--space-3)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--color-border-subtle)' }}>
          {citations.map((c) => (
            <CitationChip key={c.id} citation={c} onClick={onCitationClick} />
          ))}
        </div>
      )}

      {/* Timestamp */}
      <p style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)', textAlign: isUser ? 'right' : 'left' }}>
        {message.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
}
