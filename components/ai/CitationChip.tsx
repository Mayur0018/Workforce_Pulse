'use client';
import type { Citation } from '../../types/chat';

interface CitationChipProps {
  citation: Citation;
  onClick?: (citation: Citation) => void;
}

export default function CitationChip({ citation, onClick }: CitationChipProps) {
  const confidenceColor = {
    high: 'var(--color-success)',
    medium: 'var(--color-accent)',
    low: 'var(--color-warning)',
  }[citation.confidence ?? 'medium'] ?? 'var(--color-secondary)';

  const tooltipParts = [
    citation.rows != null && `rows: ${citation.rows}`,
    citation.task && `task: "${citation.task}"`,
    citation.employee && `employee: "${citation.employee}"`,
    citation.dept && `dept: "${citation.dept}"`,
    citation.date_range && `range: ${citation.date_range}`,
    citation.aggregation && `agg: ${citation.aggregation}`,
  ].filter(Boolean).join(' · ');

  return (
    <button
      className="citation-chip"
      style={{ borderColor: `${confidenceColor}50` }}
      onClick={() => onClick?.(citation)}
      title={tooltipParts}
      aria-label={`Citation: ${tooltipParts}`}
      id={`citation-${citation.id}`}
    >
      <span style={{ color: confidenceColor, fontWeight: 700 }}>⟨</span>
      {citation.rows != null && <span>{citation.rows} rows</span>}
      {citation.dept && <span>· {citation.dept}</span>}
      {citation.task && <span>· {citation.task}</span>}
      {citation.confidence && (
        <span style={{ color: confidenceColor }}>· {citation.confidence}</span>
      )}
      <span style={{ color: confidenceColor, fontWeight: 700 }}>⟩</span>
    </button>
  );
}
