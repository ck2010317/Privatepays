'use client';

import { ArrowDownLeft, ArrowUpRight, ShoppingBag, Coffee, Plane, Car, Film, Music } from 'lucide-react';
import { Transaction } from '@/lib/api/zeroid';
import { cn, formatCurrency, formatDate, getStatusColor } from '@/lib/utils';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'retail': ShoppingBag,
  'shopping': ShoppingBag,
  'food': Coffee,
  'restaurant': Coffee,
  'travel': Plane,
  'transport': Car,
  'entertainment': Film,
  'streaming': Music,
};

interface TransactionItemProps {
  transaction: Transaction;
}

export function TransactionItem({ transaction }: TransactionItemProps) {
  const categoryLower = transaction.merchant?.category?.toLowerCase() || '';
  const Icon = CATEGORY_ICONS[categoryLower] || ShoppingBag;
  const isIncoming = transaction.billing_amount > 0;

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 transition-colors">
      {/* Icon */}
      <div className={cn(
        'flex items-center justify-center h-12 w-12 rounded-xl',
        isIncoming ? 'bg-green-500/10' : 'bg-gray-700'
      )}>
        <Icon className={cn('h-5 w-5', isIncoming ? 'text-green-400' : 'text-gray-400')} />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">
          {transaction.merchant?.name || transaction.description || 'Transaction'}
        </p>
        <p className="text-sm text-gray-400">
          {transaction.merchant?.category || 'General'} • {formatDate(transaction.created_at)}
        </p>
      </div>

      {/* Amount & Status */}
      <div className="text-right">
        <p className={cn(
          'font-semibold',
          isIncoming ? 'text-green-400' : 'text-white'
        )}>
          {isIncoming ? '+' : '-'}{formatCurrency(Math.abs(transaction.billing_amount), transaction.billing_currency)}
        </p>
        <span className={cn(
          'inline-flex px-2 py-0.5 rounded text-xs font-medium border',
          getStatusColor(transaction.status)
        )}>
          {transaction.status}
        </span>
      </div>
    </div>
  );
}

interface TransactionListProps {
  transactions: Transaction[];
  loading?: boolean;
  emptyMessage?: string;
}

export function TransactionList({ transactions, loading, emptyMessage = 'No transactions yet' }: TransactionListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse flex items-center gap-4 p-4 rounded-xl bg-gray-800/50">
            <div className="h-12 w-12 rounded-xl bg-gray-700" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-700 rounded w-1/3" />
              <div className="h-3 bg-gray-700 rounded w-1/2" />
            </div>
            <div className="space-y-2 text-right">
              <div className="h-4 bg-gray-700 rounded w-20" />
              <div className="h-3 bg-gray-700 rounded w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="h-16 w-16 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
          <ShoppingBag className="h-8 w-8 text-gray-600" />
        </div>
        <p className="text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <TransactionItem key={transaction.id} transaction={transaction} />
      ))}
    </div>
  );
}
