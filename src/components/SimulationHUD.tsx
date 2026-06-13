/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { User } from '../types';
import { Shield, Hammer, Sparkles, RefreshCw } from 'lucide-react';

interface SimulationHUDProps {
  users: User[];
  currentUser: User | null;
  onUserChange: (user: User) => void;
  onReset: () => void;
}

export default function SimulationHUD({
  users,
  currentUser,
  onUserChange,
  onReset,
}: SimulationHUDProps) {
  const [isOpen, setIsOpen] = React.useState(true);

  return (
    <div id="simulation-hud" className="z-50 bg-stone-900 border-b border-stone-800 text-stone-300 text-xs shadow-lg transition-all duration-300 print:hidden">
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Left section: Sandbox label and Active user state */}
        <div className="flex items-center justify-between md:justify-start gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-mono text-[11px] font-bold tracking-wide text-stone-400">
              SANDBOX SIMULATOR:
            </span>
          </div>

          {currentUser ? (
            <div className="flex items-center gap-1.5 bg-stone-800 px-2 py-0.5 rounded border border-stone-700">
              {currentUser.role === 'admin' && <Shield size={12} className="text-rose-400 shrink-0" />}
              {currentUser.role === 'carpenter' && <Hammer size={12} className="text-amber-400 shrink-0" />}
              {currentUser.role === 'polish_person' && <Sparkles size={12} className="text-teal-400 shrink-0" />}
              <span className="font-semibold text-stone-200 text-[11px]">
                Logged in as <strong className="text-white">{currentUser.name}</strong> ({currentUser.role.toUpperCase()})
              </span>
            </div>
          ) : (
            <span className="text-stone-400 text-[11px] font-semibold">Not Logged In</span>
          )}
        </div>

        {/* Middle actions (scrollable on mobile) */}
        {isOpen && (
          <div className="flex items-center gap-2 flex-grow overflow-hidden md:justify-end">
            <span className="text-stone-500 hidden lg:inline shrink-0 font-medium">Quick Switch:</span>
            
            {/* Horizontal scroll wrap ensuring NO horizontal viewport blowout */}
            <div className="flex-1 md:flex-initial flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800/80 overflow-x-auto no-scrollbar scroll-smooth">
              {users.map((u) => {
                const isActive = currentUser?.id === u.id;
                let colorClass = 'text-stone-400 hover:bg-stone-800 hover:text-white border border-transparent';
                if (isActive) {
                  if (u.role === 'admin') colorClass = 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold';
                  else if (u.role === 'carpenter') colorClass = 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold';
                  else colorClass = 'bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold';
                }
                return (
                  <button
                    key={u.id}
                    onClick={() => onUserChange(u)}
                    className={`px-2.5 py-1 rounded-lg transition-all text-[11px] font-medium shrink-0 ${colorClass} ${!u.is_active ? 'opacity-40' : ''}`}
                    title={`${u.email} - ${u.is_active ? 'Active' : 'Inactive'}`}
                  >
                    {u.name} ({u.initials})
                  </button>
                );
              })}
            </div>

            <button
              onClick={onReset}
              className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition shrink-0"
              title="Reset all localStorage values to original seeded demo parameters"
            >
              <RefreshCw size={11} className="shrink-0" />
              <span className="hidden sm:inline">Reset Demo DB</span>
              <span className="sm:hidden">Reset</span>
            </button>
          </div>
        )}

        <div className="flex items-center justify-end">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-[10px] uppercase font-mono tracking-wider font-semibold text-stone-500 hover:text-stone-300 px-2.5 py-1 border border-stone-800 rounded-lg hover:border-stone-700 transition shrink-0"
          >
            {isOpen ? 'Collapse Controls' : 'Swapper Open'}
          </button>
        </div>

      </div>
    </div>
  );
}
