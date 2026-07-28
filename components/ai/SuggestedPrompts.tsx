'use client';
import { SUGGESTED_PROMPTS } from '../../constants/ai';

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export default function SuggestedPrompts({ onSelect, disabled }: SuggestedPromptsProps) {
  return (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-2)' }}>
        Suggested Questions
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => !disabled && onSelect(prompt)}
            disabled={disabled}
            style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-full)',
              padding: '6px 14px',
              fontSize: '0.8rem',
              color: 'var(--color-text-secondary)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all var(--transition-fast)',
              opacity: disabled ? 0.5 : 1,
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              if (!disabled) {
                (e.target as HTMLElement).style.background = 'var(--color-primary-dim)';
                (e.target as HTMLElement).style.color = 'var(--color-primary-light)';
                (e.target as HTMLElement).style.borderColor = 'var(--color-border)';
              }
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = 'var(--color-bg-elevated)';
              (e.target as HTMLElement).style.color = 'var(--color-text-secondary)';
              (e.target as HTMLElement).style.borderColor = 'var(--color-border-subtle)';
            }}
            id={`suggested-prompt-${prompt.slice(0, 20).replace(/\s+/g, '-').toLowerCase()}`}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
