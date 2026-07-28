'use client';
import React, { ReactNode } from 'react';
import { MobileNavProvider, useMobileNav } from './MobileNavContext';
import Sidebar from './Sidebar';

function AppLayoutInner({ children }: { children: ReactNode }) {
  const { mobileOpen, setMobileOpen } = useMobileNav();
  return (
    <div className="app-layout">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main className="app-main">
        {children}
      </main>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <MobileNavProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </MobileNavProvider>
  );
}
