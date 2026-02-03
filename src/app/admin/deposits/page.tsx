'use client';

import { useEffect, useState } from 'react';
import { Wallet, Check, X, Loader2, User, Clock, Hash, Copy, CheckCheck } from 'lucide-react';

interface Deposit {
  id: string;
  amount: number;
  currency: string;
  network: string;
  status: string;
  address: string | null;
  txHash: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    balance: number;
  };
}

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'confirmed' | 'rejected'>('pending');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchDeposits();
  }, [filterStatus]);

  const fetchDeposits = async () => {
    try {
      const status = filterStatus === 'all' ? '' : filterStatus;
      const res = await fetch(`/api/admin/deposits?status=${status}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch deposits');
      }

      setDeposits(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch deposits');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (depositId: string, action: 'confirm' | 'reject') => {
    setProcessingId(depositId);

    try {
      const res = await fetch(`/api/admin/deposits/${depositId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Failed to ${action} deposit`);
      }

      // Refresh the list
      fetchDeposits();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} deposit`);
    } finally {
      setProcessingId(null);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Deposits</h1>
          <p className="text-gray-400 mt-1">Review and confirm user deposits</p>
        </div>

        {/* Filter */}
        <div className="flex items-center space-x-2">
          {(['all', 'pending', 'confirmed', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => {
                setIsLoading(true);
                setFilterStatus(status);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === status
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Deposits Grid */}
      <div className="grid grid-cols-1 gap-4">
        {deposits.length > 0 ? (
          deposits.map((deposit) => (
            <div
              key={deposit.id}
              className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-500/20 p-3 rounded-lg">
                    <Wallet className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      ${deposit.amount} {deposit.currency}
                    </h3>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                      <span className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        {deposit.user.name || deposit.user.email}
                      </span>
                      <span className="bg-gray-700/50 px-2 py-0.5 rounded text-xs">
                        {deposit.network}
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {new Date(deposit.createdAt).toLocaleString()}
                      </span>
                    </div>
                    
                    {deposit.txHash && (
                      <div className="mt-3 flex items-center space-x-2">
                        <Hash className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-400 text-sm font-mono truncate max-w-md">
                          {deposit.txHash}
                        </span>
                        <button
                          onClick={() => copyToClipboard(deposit.txHash!, deposit.id)}
                          className="p-1 hover:bg-gray-700 rounded transition-colors"
                        >
                          {copiedId === deposit.id ? (
                            <CheckCheck className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                      </div>
                    )}

                    <div className="mt-2 text-sm text-gray-500">
                      Current User Balance: ${deposit.user.balance.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {deposit.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleAction(deposit.id, 'reject')}
                        disabled={processingId === deposit.id}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                      >
                        {processingId === deposit.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => handleAction(deposit.id, 'confirm')}
                        disabled={processingId === deposit.id}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                      >
                        {processingId === deposit.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        <span>Confirm</span>
                      </button>
                    </>
                  ) : (
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        deposit.status === 'confirmed'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {deposit.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No {filterStatus === 'all' ? '' : filterStatus} deposits</p>
          </div>
        )}
      </div>
    </div>
  );
}
