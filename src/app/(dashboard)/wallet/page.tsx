'use client';

import { useEffect, useState } from 'react';
import { Receipt, CreditCard, TrendingUp, Clock, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

interface PaymentOrder {
  id: string;
  type: string;
  amountUsd: number;
  amountSol: number;
  solPrice: number;
  cardTitle: string | null;
  topUpAmount: number | null;
  status: string;
  txSignature: string | null;
  paidAmount: number | null;
  paidAt: string | null;
  createdAt: string;
  expiresAt: string;
}

const statusConfig = {
  pending: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: Clock, label: 'Pending' },
  processing: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Clock, label: 'Processing' },
  completed: { color: 'text-green-400', bg: 'bg-green-500/10', icon: CheckCircle, label: 'Completed' },
  failed: { color: 'text-red-400', bg: 'bg-red-500/10', icon: XCircle, label: 'Failed' },
  expired: { color: 'text-gray-400', bg: 'bg-gray-500/10', icon: XCircle, label: 'Expired' },
};

export default function PaymentHistoryPage() {
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    async function loadOrders() {
      try {
        const status = filter === 'all' ? '' : filter;
        const res = await fetch(`/api/payment-orders${status ? `?status=${status}` : ''}`);
        const data = await res.json();
        setOrders(data.orders || []);
      } catch (error) {
        console.error('Failed to load payment orders:', error);
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, [filter]);

  const getStatusInfo = (status: string) => {
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Payment History</h1>
          <p className="text-gray-400 mt-1">Track your crypto payments for cards and top-ups</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'completed', 'failed', 'expired'].map((status) => (
          <button
            key={status}
            onClick={() => {
              setLoading(true);
              setFilter(status);
            }}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize',
              filter === status
                ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:text-white'
            )}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 rounded-xl bg-gray-900 border border-gray-800 animate-pulse">
              <div className="flex justify-between items-start mb-4">
                <div className="h-6 w-32 bg-gray-800 rounded" />
                <div className="h-6 w-24 bg-gray-800 rounded" />
              </div>
              <div className="h-4 w-48 bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl bg-gray-900 border border-gray-800">
          <div className="h-20 w-20 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
            <Receipt className="h-10 w-10 text-gray-600" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No payments yet</h3>
          <p className="text-gray-400 text-center max-w-sm">
            Your payment history will appear here when you create cards or top-up.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusInfo = getStatusInfo(order.status);
            const StatusIcon = statusInfo.icon;
            
            return (
              <div
                key={order.id}
                className="p-6 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg', order.type === 'card_creation' ? 'bg-violet-500/10' : 'bg-green-500/10')}>
                      {order.type === 'card_creation' ? (
                        <CreditCard className={cn('h-5 w-5', order.type === 'card_creation' ? 'text-violet-400' : 'text-green-400')} />
                      ) : (
                        <TrendingUp className="h-5 w-5 text-green-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">
                        {order.type === 'card_creation' ? 'Card Creation' : 'Card Top-up'}
                      </h3>
                      {order.cardTitle && (
                        <p className="text-sm text-gray-400">{order.cardTitle}</p>
                      )}
                    </div>
                  </div>
                  <div className={cn('flex items-center gap-1.5 px-3 py-1 rounded-full text-sm', statusInfo.bg)}>
                    <StatusIcon className={cn('h-3.5 w-3.5', statusInfo.color)} />
                    <span className={statusInfo.color}>{statusInfo.label}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Amount USD</p>
                    <p className="text-white font-medium">${order.amountUsd.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Amount SOL</p>
                    <p className="text-white font-medium">{order.amountSol.toFixed(4)} SOL</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">SOL Price</p>
                    <p className="text-white font-medium">${order.solPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Created</p>
                    <p className="text-white font-medium">{formatDate(order.createdAt)}</p>
                  </div>
                </div>

                {order.txSignature && (
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-800">
                    <span className="text-xs text-gray-500">Transaction:</span>
                    <a
                      href={`https://solscan.io/tx/${order.txSignature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 font-mono"
                    >
                      {order.txSignature.slice(0, 8)}...{order.txSignature.slice(-8)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
