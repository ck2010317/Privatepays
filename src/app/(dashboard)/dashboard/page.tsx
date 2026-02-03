'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  Plus,
  ChevronRight,
  Activity,
  DollarSign,
  Clock,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn, formatCurrency } from '@/lib/utils';

interface Card {
  id: string;
  title: string;
  status: string;
  balance: number;
  currency: string;
  lastFour: string | null;
  expiryMonth: string | null;
  expiryYear: string | null;
  createdAt: string;
}

interface CardRequest {
  id: string;
  title: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  createdAt: string;
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  iconColor: string;
}

function StatCard({ title, value, subtitle, icon: Icon, iconColor }: StatCardProps) {
  return (
    <div className="p-6 rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('p-3 rounded-xl', iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm text-gray-400">{title}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { user, setCreateCardModalOpen } = useAppStore();
  const [cards, setCards] = useState<Card[]>([]);
  const [pendingRequests, setPendingRequests] = useState<CardRequest[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [cardsRes, transactionsRes] = await Promise.all([
          fetch('/api/user/cards'),
          fetch('/api/user/transactions?limit=5'),
        ]);

        const cardsData = await cardsRes.json();
        const transactionsData = await transactionsRes.json();

        if (cardsRes.ok) {
          setCards(cardsData.cards || []);
          setPendingRequests(cardsData.pendingRequests || []);
        }
        if (transactionsRes.ok) {
          setTransactions(transactionsData || []);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const activeCards = cards.filter(c => c.status === 'active').length;
  const totalCardBalance = cards.reduce((sum, c) => sum + (c.balance || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
          </h1>
          <p className="text-gray-400 mt-1">Here's what's happening with your account</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCreateCardModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/25"
          >
            <Plus className="h-4 w-4" />
            New Card
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Active Cards"
          value={activeCards.toString()}
          subtitle={`${cards.length} total cards`}
          icon={CreditCard}
          iconColor="bg-blue-500/10 text-blue-400"
        />
        <StatCard
          title="Total Card Balance"
          value={formatCurrency(totalCardBalance)}
          subtitle="Across all cards"
          icon={DollarSign}
          iconColor="bg-purple-500/10 text-purple-400"
        />
        <StatCard
          title="Pending Payments"
          value={pendingRequests.length.toString()}
          subtitle="Awaiting confirmation"
          icon={Clock}
          iconColor="bg-yellow-500/10 text-yellow-400"
        />
      </div>

      {/* Pending Requests Alert */}
      {pendingRequests.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <h3 className="text-yellow-400 font-medium mb-2">Pending Card Requests</h3>
          <div className="space-y-2">
            {pendingRequests.slice(0, 3).map((request) => (
              <div key={request.id} className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3">
                <div>
                  <span className="text-white">{request.title}</span>
                  <span className="text-gray-400 text-sm ml-2">
                    - ${request.amount} initial balance
                  </span>
                </div>
                <span className="text-yellow-400 text-sm flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  Pending
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cards Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Your Cards</h2>
            <Link
              href="/cards"
              className="flex items-center gap-1 text-sm text-green-400 hover:text-green-300 transition-colors"
            >
              View All
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse aspect-[1.586/1] rounded-2xl bg-gray-800" />
              ))}
            </div>
          ) : cards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cards.slice(0, 4).map((card) => (
                <div
                  key={card.id}
                  className="aspect-[1.586/1] rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 p-6 flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-gray-400 text-sm">{card.title}</p>
                      <p className="text-white text-xl font-bold mt-1">
                        ${card.balance.toFixed(2)}
                      </p>
                    </div>
                    <span className={cn(
                      'px-2 py-1 rounded text-xs',
                      card.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      card.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    )}>
                      {card.status}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-gray-400 font-mono tracking-widest">
                      •••• •••• •••• {card.lastFour || '****'}
                    </p>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Expires</span>
                      <span className="text-gray-300">
                        {card.expiryMonth && card.expiryYear 
                          ? `${card.expiryMonth}/${card.expiryYear}` 
                          : '**/**'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 rounded-2xl bg-gray-900 border border-gray-800">
              <div className="h-16 w-16 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
                <CreditCard className="h-8 w-8 text-gray-600" />
              </div>
              <p className="text-gray-400 mb-4">No cards yet</p>
              <button
                onClick={() => setCreateCardModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm hover:bg-green-500/20 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Your First Card
              </button>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="p-6 rounded-2xl bg-gray-900 border border-gray-800">
            <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => setCreateCardModalOpen(true)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 text-white transition-colors"
              >
                <CreditCard className="h-5 w-5 text-green-400" />
                <span>Create New Card</span>
                <ArrowUpRight className="h-4 w-4 ml-auto text-gray-500" />
              </button>
              <Link
                href="/transactions"
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 text-white transition-colors"
              >
                <Activity className="h-5 w-5 text-purple-400" />
                <span>View Transactions</span>
                <ArrowUpRight className="h-4 w-4 ml-auto text-gray-500" />
              </Link>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="p-6 rounded-2xl bg-gray-900 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Recent Activity</h3>
              <Link href="/transactions" className="text-sm text-green-400 hover:text-green-300">
                View all
              </Link>
            </div>
            {transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center',
                        tx.type === 'deposit' ? 'bg-green-500/20' : 'bg-red-500/20'
                      )}>
                        {tx.type === 'deposit' ? (
                          <TrendingUp className="w-4 h-4 text-green-400" />
                        ) : (
                          <DollarSign className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-white text-sm capitalize">{tx.type.replace('_', ' ')}</p>
                        <p className="text-gray-500 text-xs">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={cn(
                      'font-medium',
                      tx.type === 'deposit' ? 'text-green-400' : 'text-white'
                    )}>
                      {tx.type === 'deposit' ? '+' : '-'}${tx.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No transactions yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
