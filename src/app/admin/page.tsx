'use client';

import { useEffect, useState } from 'react';
import { 
  Users, 
  CreditCard, 
  Wallet, 
  TrendingUp, 
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalCards: number;
  pendingCardRequests: number;
  pendingDeposits: number;
  pendingTopUps: number;
  totalPending: number;
  totalDepositsValue: number;
}

interface RecentActivity {
  deposits: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
    user: { email: string; name: string | null };
  }>;
  cardRequests: Array<{
    id: string;
    title: string;
    amount: number;
    status: string;
    createdAt: string;
    user: { email: string; name: string | null };
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin/stats');
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch stats');
        }

        setStats(data.stats);
        setRecentActivity(data.recentActivity);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stats');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      icon: Users,
      label: 'Total Users',
      value: stats?.totalUsers ?? 0,
      change: `${stats?.activeUsers ?? 0} active`,
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: CreditCard,
      label: 'Total Cards',
      value: stats?.totalCards ?? 0,
      change: 'All time',
      color: 'from-purple-500 to-purple-600',
    },
    {
      icon: Clock,
      label: 'Pending Requests',
      value: stats?.totalPending ?? 0,
      change: 'Needs attention',
      color: 'from-yellow-500 to-orange-500',
    },
    {
      icon: Wallet,
      label: 'Total Deposits',
      value: `$${(stats?.totalDepositsValue ?? 0).toLocaleString()}`,
      change: 'Confirmed deposits',
      color: 'from-green-500 to-emerald-600',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-gray-400 mt-1">Overview of your PrivatePay platform</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`bg-gradient-to-br ${card.color} p-3 rounded-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{card.value}</div>
            <div className="text-gray-400 text-sm">{card.label}</div>
            <div className="text-xs text-gray-500 mt-2">{card.change}</div>
          </div>
        ))}
      </div>

      {/* Pending Actions */}
      {stats && stats.totalPending > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-yellow-400 mb-4">Pending Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.pendingCardRequests > 0 && (
              <a
                href="/admin/card-requests"
                className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-white">{stats.pendingCardRequests} Card Requests</span>
                  <ArrowUpRight className="w-4 h-4 text-yellow-400" />
                </div>
              </a>
            )}
            {stats.pendingDeposits > 0 && (
              <a
                href="/admin/deposits"
                className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-white">{stats.pendingDeposits} Pending Deposits</span>
                  <ArrowUpRight className="w-4 h-4 text-yellow-400" />
                </div>
              </a>
            )}
            {stats.pendingTopUps > 0 && (
              <a
                href="/admin/topup-requests"
                className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-white">{stats.pendingTopUps} Top-Up Requests</span>
                  <ArrowUpRight className="w-4 h-4 text-yellow-400" />
                </div>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Deposits */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Deposits</h3>
          {recentActivity?.deposits.length ? (
            <div className="space-y-3">
              {recentActivity.deposits.map((deposit) => (
                <div
                  key={deposit.id}
                  className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg"
                >
                  <div>
                    <p className="text-white font-medium">
                      ${deposit.amount} {deposit.currency}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {deposit.user.name || deposit.user.email}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        deposit.status === 'confirmed'
                          ? 'bg-green-500/20 text-green-400'
                          : deposit.status === 'pending'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {deposit.status}
                    </span>
                    <p className="text-gray-500 text-xs mt-1">
                      {new Date(deposit.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No recent deposits</p>
          )}
        </div>

        {/* Recent Card Requests */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Card Requests</h3>
          {recentActivity?.cardRequests.length ? (
            <div className="space-y-3">
              {recentActivity.cardRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg"
                >
                  <div>
                    <p className="text-white font-medium">{request.title}</p>
                    <p className="text-gray-400 text-sm">
                      {request.user.name || request.user.email}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        request.status === 'approved' || request.status === 'completed'
                          ? 'bg-green-500/20 text-green-400'
                          : request.status === 'pending'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {request.status}
                    </span>
                    <p className="text-gray-500 text-xs mt-1">
                      ${request.amount}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No recent card requests</p>
          )}
        </div>
      </div>
    </div>
  );
}
