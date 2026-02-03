'use client';

import { useEffect, useState } from 'react';
import { Plus, Filter, Search, CreditCard as CardIcon } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { fetchCards } from '@/lib/api/client';
import { Card } from '@/lib/api/zeroid';
import { CreditCardComponent } from '@/components/cards/credit-card';

export default function CardsPage() {
  const { setCreateCardModalOpen } = useAppStore();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'frozen'>('all');
  const [search, setSearch] = useState('');

  const loadCards = async () => {
    try {
      const data = await fetchCards(0, 50);
      setCards(data.cards);
    } catch (error) {
      console.error('Failed to load cards:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, []);

  const filteredCards = cards.filter((card) => {
    const matchesFilter = filter === 'all' || card.status === filter;
    const matchesSearch = !search || 
      card.title.toLowerCase().includes(search.toLowerCase()) ||
      card.email?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Cards</h1>
          <p className="text-gray-400 mt-1">Manage your virtual prepaid cards</p>
        </div>
        <button
          onClick={() => setCreateCardModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/25"
        >
          <Plus className="h-4 w-4" />
          New Card
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cards..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'frozen'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:text-white'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[1.586/1] rounded-2xl bg-gray-800" />
              <div className="flex gap-2 mt-3">
                <div className="flex-1 h-10 rounded-xl bg-gray-800" />
                <div className="w-24 h-10 rounded-xl bg-gray-800" />
                <div className="w-24 h-10 rounded-xl bg-gray-800" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredCards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCards.map((card) => (
            <CreditCardComponent
              key={card.card_id || card.id}
              card={card}
              onUpdate={loadCards}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl bg-gray-900 border border-gray-800">
          <div className="h-20 w-20 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
            <CardIcon className="h-10 w-10 text-gray-600" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            {search || filter !== 'all' ? 'No matching cards' : 'No cards yet'}
          </h3>
          <p className="text-gray-400 mb-6 text-center max-w-sm">
            {search || filter !== 'all'
              ? 'Try adjusting your filters or search query'
              : 'Create your first virtual card to start making payments'}
          </p>
          {!search && filter === 'all' && (
            <button
              onClick={() => setCreateCardModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/25"
            >
              <Plus className="h-5 w-5" />
              Create Your First Card
            </button>
          )}
        </div>
      )}
    </div>
  );
}
