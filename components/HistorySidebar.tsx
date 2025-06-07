
import React from 'react';
import { ChatSessionRecord } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';

interface HistorySidebarProps {
  sessions: ChatSessionRecord[];
  activeSessionId: string | null;
  onLoadSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  isOpen: boolean;
  onToggle: () => void; // For closing on mobile when an item is clicked
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({
  sessions,
  activeSessionId,
  onLoadSession,
  onNewSession,
  onDeleteSession,
  isOpen,
  onToggle
}) => {
  const sortedSessions = [...sessions].sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime());

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (!isOpen) {
    return null; // Sidebar is hidden
  }

  return (
    <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 border-r border-slate-800 shadow-xl transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:flex md:flex-col flex-shrink-0 h-full`}>
      <div className="p-4 border-b border-slate-800">
        <button
          onClick={() => {
            onNewSession();
            // if (window.innerWidth < 768) onToggle(); // Close sidebar on mobile after new chat
          }}
          className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-cyan-500"
          aria-label="เริ่มแชทใหม่"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          เริ่มแชทใหม่
        </button>
      </div>
      <nav className="flex-grow overflow-y-auto p-2 space-y-1">
        {sortedSessions.map((session) => (
          <div
            key={session.id}
            className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors duration-150
                        ${session.id === activeSessionId ? 'bg-slate-700 text-white shadow-inner' : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'}`}
            onClick={() => {
                onLoadSession(session.id);
                // if (window.innerWidth < 768) onToggle(); // Close sidebar on mobile
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onLoadSession(session.id)}
            aria-current={session.id === activeSessionId ? "page" : undefined}
          >
            <div className="flex-grow overflow-hidden">
              <p className="text-sm font-medium truncate" title={session.name}>{session.name}</p>
              <p className={`text-xs ${session.id === activeSessionId ? 'text-slate-300' : 'text-slate-500 group-hover:text-slate-400'}`}>
                {formatDate(session.lastUpdatedAt)}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent loading the chat
                if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบแชท "${session.name}"?`)) {
                  onDeleteSession(session.id);
                }
              }}
              className={`p-1 rounded text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity duration-150 focus:opacity-100
                          ${session.id === activeSessionId ? 'opacity-100 text-slate-400 hover:text-red-400' : ''}`}
              aria-label={`ลบแชท ${session.name}`}
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
        {sortedSessions.length === 0 && (
            <p className="p-3 text-sm text-slate-500 text-center">ไม่มีประวัติการแชท</p>
        )}
      </nav>
      <div className="p-3 border-t border-slate-800 text-center">
        <p className="text-xs text-slate-600">&copy; {new Date().getFullYear()} Gemini Chat</p>
      </div>
    </div>
  );
};

export default HistorySidebar;
