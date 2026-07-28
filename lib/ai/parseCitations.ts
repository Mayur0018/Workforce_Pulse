/**
 * parseCitations.ts — Extract and parse [cite: ...] blocks from AI responses.
 */
import type { Citation } from '../../types/chat';
import { CITATION_REGEX } from '../../constants/ai';

export function parseCitations(content: string): { cleanedContent: string; citations: Citation[] } {
  const citations: Citation[] = [];
  let idCounter = 0;

  const cleanedContent = content.replace(new RegExp(CITATION_REGEX.source, 'g'), (match, inner) => {
    const id = `cite-${Date.now()}-${idCounter++}`;
    const citation: Citation = { id, raw: match };

    // Parse key=value pairs from the citation string
    const parts = inner.split(',').map((p: string) => p.trim());
    parts.forEach((part: string) => {
      const eqIdx = part.indexOf('=');
      if (eqIdx === -1) return;
      const key = part.slice(0, eqIdx).trim();
      const val = part.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');

      switch (key) {
        case 'rows': citation.rows = parseInt(val, 10) || undefined; break;
        case 'task': if (val && val !== 'NA') citation.task = val; break;
        case 'employee': if (val && val !== 'NA') citation.employee = val; break;
        case 'dept': if (val && val !== 'NA') citation.dept = val; break;
        case 'date_range': citation.date_range = val; break;
        case 'aggregation': citation.aggregation = val; break;
        case 'confidence':
          if (val === 'high' || val === 'medium' || val === 'low') {
            citation.confidence = val;
          }
          break;
      }
    });

    citations.push(citation);
    return `[${id}]`; // placeholder in cleaned content
  });

  return { cleanedContent, citations };
}
