'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Check, X, Loader2, User, DollarSign, Clock, CreditCard } from 'lucide-react';

interface TopUpRequest {
  id: string;
  amount: number;
  currency: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  card: {
    id: string;
    title: string;
    zeroidCardId: string | null;
    balance: number;
    user: {
      id: string;
      email: string;
      name: string | null;
      balance: number;
    };
  };
}

export default function TopUpRequestsPage() {
  const [requests, setRequests] = useState<TopUpRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    fetchRequests();
  }, [filterStatus]);

  const fetchRequests = async () => {
    try {
      const status = filterStatus === 'all' ? '' : filterStatus;
      const res = await fetch(`/api/admin/topup-requests?status=${status}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch top-up requests');
      }

      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch top-up requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (requestId: string, action: 'approve' | 'reject', note?: string) => {
    setProcessingId(requestId);

    try {
      const res = await fetch(`/api/admin/topup-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, adminNote: note }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Failed to ${action} request`);
      }

      // Refresh the list
      fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} request`);
    } finally {
      setProcessingId(null);
    }
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
          <h1 className="text-3xl font-bold text-white">Top-Up Requests</h1>
          <p className="text-gray-400 mt-1">Review and approve card top-up requests</p>
        </div>

        {/* Filter */}
        <div className="flex items-center space-x-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
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

      {/* Requests Grid */}
      <div className="grid grid-cols-1 gap-4">
        {requests.length > 0 ? (
          requests.map((request) => (
            <div
              key={request.id}
              className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="bg-green-500/20 p-3 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      ${request.amount} {request.currency} Top-Up
                    </h3>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                      <span className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        {request.card.user.name || request.card.user.email}
                      </span>
                      <span className="flex items-center">
                        <CreditCard className="w-4 h-4 mr-1" />
                        {request.card.title}
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {new Date(request.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center space-x-4 text-sm">
                      <span className="text-gray-500">
                        User Balance: ${request.card.user.balance.toFixed(2)}
                      </span>
                      <span className="text-gray-500">
                        Card Balance: ${request.card.balance.toFixed(2)}
                      </span>
                      {request.card.user.balance < request.amount && (
                        <span className="text-red-400">
                          (Insufficient funds)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {request.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleAction(request.id, 'reject', 'Request rejected by admin')}
                        disabled={processingId === request.id}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                      >
                        {processingId === request.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => handleAction(request.id, 'approve')}
                        disabled={processingId === request.id || request.card.user.balance < request.amount}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingId === request.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        <span>Approve</span>
                      </button>
                    </>
                  ) : (
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        request.status === 'approved' || request.status === 'completed'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {request.status}
                    </span>
                  )}
                </div>
              </div>

              {request.adminNote && (
                <div className="mt-4 p-3 bg-gray-900/50 rounded-lg text-sm text-gray-400">
                  <span className="font-medium">Admin Note:</span> {request.adminNote}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-gray-500">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No {filterStatus === 'all' ? '' : filterStatus} top-up requests</p>
          </div>
        )}
      </div>
    </div>
  );
}
