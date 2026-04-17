import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { QueueStatusBadge } from './QueueStatusBadge';

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      {navOpen && (
        <div
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-hidden="true"
        />
      )}
      <main className="flex-1 overflow-auto flex flex-col min-w-0">
        <div className="h-12 px-3 flex items-center justify-between border-b border-gray-200 bg-white shrink-0 md:h-8 md:justify-end">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="md:hidden -ml-1 p-2 text-gray-600 hover:text-gray-900 rounded-md"
            aria-label="Open navigation"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <QueueStatusBadge />
        </div>
        <div className="flex-1 overflow-auto p-3 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
