'use client';

import { useEffect, useState } from 'react';
import { Calendar, Download, ChevronLeft, ChevronRight, Search, CreditCard, TrendingUp, ShoppingBag, Receipt } from 'lucide-react';
import { fetchCards, fetchCardTransactions } from '@/lib/api/client';
import { Card, Transaction } from '@/lib/api/zeroid';
import { TransactionList } from '@/components/transactions/transaction-list';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

interface PlatformTransaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  createdAt: string;
  card?: {
    id: string;
    title: string;
  } | null;
}

type TransactionType = 'all' | 'spending' | 'payments';

export default function TransactionsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [platformTransactions, setPlatformTransactions] = useState<PlatformTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType>('all');
  const [dateRange, setDateRange] = useState({
    from: '',
    to: '',
  });
  const [search, setSearch] = useState('');

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    fetchCards(0, 50).then((data) => setCards(data.cards)).catch(console.error);
    loadPlatformTransactions();
  }, []);

  useEffect(() => {
    if (transactionType !== 'payments') {
      loadTransactions();
    }
  }, [selectedCardId, page, dateRange, transactionType]);

  const loadPlatformTransactions = async () => {
    try {
      const res = await fetch('/api/user/transactions?limit=100');
      const data = await res.json();
      setPlatformTransactions(data.transactions || data || []);
    } catch (error) {
      console.error('Failed to load platform transactions:', error);
    }
  };

  const loadTransactions = async () => {
    if (transactionType === 'payments') {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      if (selectedCardId === 'all') {
        // Load transactions from all cards
        const allTransactions: Transaction[] = [];
        for (const card of cards.slice(0, 10)) {
          const cardId = card.card_id || card.id;
          try {
            const data = await fetchCardTransactions(cardId, {
              skip: 0,
              limit: 20,
              from_date: dateRange.from || undefined,
              to_date: dateRange.to || undefined,
            });
            allTransactions.push(...data.transactions);
          } catch (e) {
            // Skip cards with errors
          }
        }
        // Sort by date
        allTransactions.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setTransactions(allTransactions.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE));
        setHasMore(allTransactions.length > (page + 1) * ITEMS_PER_PAGE);
      } else {
        const data = await fetchCardTransactions(selectedCardId, {
          skip: page * ITEMS_PER_PAGE,
          limit: ITEMS_PER_PAGE,
          from_date: dateRange.from || undefined,
          to_date: dateRange.to || undefined,
        });
        setTransactions(data.transactions);
        setHasMore(data.has_more);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      tx.merchant?.name?.toLowerCase().includes(searchLower) ||
      tx.merchant?.category?.toLowerCase().includes(searchLower) ||
      tx.description?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Transactions</h1>
          <p className="text-gray-400 mt-1">View your transaction history</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white hover:bg-gray-700 transition-colors">
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      {/* Transaction Type Tabs */}
      <div className="flex gap-2">
        {([
          { value: 'all', label: 'All Activity', icon: Receipt },
          { value: 'spending', label: 'Card Spending', icon: ShoppingBag },
          { value: 'payments', label: 'Payments & Top-ups', icon: TrendingUp },
        ] as const).map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setTransactionType(tab.value);
              setPage(0);
            }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
              transactionType === tab.value
                ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:text-white'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
          />
        </div>

        {transactionType !== 'payments' && (
          <select
            value={selectedCardId}
            onChange={(e) => {
              setSelectedCardId(e.target.value);
              setPage(0);
            }}
            className="h-10 px-4 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
          >
            <option value="all">All Cards</option>
            {cards.map((card) => (
              <option key={card.card_id || card.id} value={card.card_id || card.id}>
                {card.title}
              </option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="h-10 pl-10 pr-4 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
            />
          </div>
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            className="h-10 px-4 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
          />
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div className="p-6">
          {transactionType === 'payments' ? (
            // Platform Transactions (Payments & Top-ups)
            <div className="space-y-3">
              {platformTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No payment transactions yet</p>
                </div>
              ) : (
                platformTransactions
                  .filter(tx => !search || tx.description?.toLowerCase().includes(search.toLowerCase()))
                  .map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          'p-2.5 rounded-xl',
                          tx.type === 'card_creation' ? 'bg-violet-500/10' : 
                          tx.type === 'card_topup' ? 'bg-green-500/10' : 'bg-gray-700'
                        )}>
                          {tx.type === 'card_creation' ? (
                            <CreditCard className="h-5 w-5 text-violet-400" />
                          ) : (
                            <TrendingUp className="h-5 w-5 text-green-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            {tx.type === 'card_creation' ? 'Card Created' : 
                             tx.type === 'card_topup' ? 'Card Top-up' : 
                             tx.type.replace(/_/g, ' ')}
                          </p>
                          <p className="text-sm text-gray-400">
                            {tx.description || tx.card?.title || 'Transaction'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          'font-semibold',
                          tx.amount < 0 ? 'text-red-400' : 'text-green-400'
                        )}>
                          {tx.amount < 0 ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(tx.createdAt)}</p>
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full',
                          tx.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                          tx.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                          'bg-red-500/10 text-red-400'
                        )}>
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          ) : (
            // Card Spending Transactions (from ZeroID)
            <TransactionList
              transactions={filteredTransactions}
              loading={loading}
              emptyMessage="No card transactions found"
            />
          )}
        </div>

        {/* Pagination */}
        {!loading && transactions.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
            <p className="text-sm text-gray-400">
              Page {page + 1}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  page === 0
                    ? 'text-gray-600 cursor-not-allowed'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                )}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={!hasMore}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  !hasMore
                    ? 'text-gray-600 cursor-not-allowed'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                )}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
