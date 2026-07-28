'use client';
import { useETL } from '../../hooks/useETL';
import Header from '../../components/layout/Header';
import ChatInterface from '../../components/ai/ChatInterface';
import { AlertCircle } from 'lucide-react';

export default function AIAssistantPage() {
  const { analytics, loading, error } = useETL();

  return (
    <>
      <Header
        title="AI Assistant"
        subtitle="Grounded in your dataset · Every claim is cited"
      />
      <div className="page-content" style={{ maxWidth: 900 }}>
        {error && (
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', padding: 'var(--space-4)', background: 'var(--color-danger-dim)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)', fontSize: '0.85rem', color: 'var(--color-danger)' }}>
            <AlertCircle size={16} />
            Dataset not loaded. {error}
          </div>
        )}
        <ChatInterface analytics={loading ? null : analytics} />
      </div>
    </>
  );
}
