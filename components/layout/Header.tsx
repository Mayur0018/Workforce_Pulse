'use client';
import { useState, useCallback } from 'react';
import { Menu, Sun, Moon, Download } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuToggle?: () => void;
  onExport?: () => void;
}

export default function Header({ title, subtitle, onMenuToggle, onExport }: HeaderProps) {
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = useCallback(() => {
    const newTheme = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme === 'light' ? 'light' : '');
    setIsDark(!isDark);
  }, [isDark]);

  return (
    <header className="header" role="banner">
      {/* Left: hamburger + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <button
          className="btn btn-ghost btn-icon"
          onClick={onMenuToggle}
          aria-label="Toggle navigation menu"
          style={{ display: 'none' }}
          id="mobile-menu-btn"
        >
          <Menu size={18} />
        </button>
        <div>
          <h1 className="header-title">{title}</h1>
          {subtitle && <p className="header-subtitle">{subtitle}</p>}
        </div>
      </div>

      {/* Right: actions */}
      <div className="header-actions">
        <button
          className="btn btn-ghost btn-icon"
          onClick={toggleTheme}
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          id="theme-toggle-btn"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {onExport && (
          <button
            className="btn btn-primary btn-sm"
            onClick={onExport}
            aria-label="Export dashboard as PDF"
            id="export-pdf-btn"
          >
            <Download size={14} />
            Export PDF
          </button>
        )}
      </div>
    </header>
  );
}
