import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { QueueStatusBadge } from './QueueStatusBadge';

export function AppShell() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto flex flex-col">
        <div className="h-8 px-4 flex items-center justify-end border-b border-gray-200 bg-white shrink-0">
          <QueueStatusBadge />
        </div>
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
