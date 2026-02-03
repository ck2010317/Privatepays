'use client';

import { Bell, Plus, Search } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export function Header() {
  const { setCreateCardModalOpen, setDepositModalOpen } = useAppStore();

  return (
    <header className="sticky top-0 z-30 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Search */}
        <div className="flex items-center gap-4 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search cards, transactions..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDepositModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Deposit
          </button>
          <button
            onClick={() => setCreateCardModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-sm font-medium text-white hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/25"
          >
            <Plus className="h-4 w-4" />
            New Card
          </button>
          <button className="relative p-2.5 rounded-xl bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-violet-500" />
          </button>
        </div>
      </div>
    </header>
  );
}
