'use client';

import { useState } from 'react';
import { X, Eye, EyeOff, Copy, Check, Download } from 'lucide-react';
import { Card, CardSensitive } from '@/lib/api/zeroid';
import { cn, formatCardNumber, maskCardNumber, formatCurrency } from '@/lib/utils';
import { fetchCardSensitive } from '@/lib/api/client';

interface CardDetailsModalProps {
  card: Card;
  isOpen: boolean;
  onClose: () => void;
}

export function CardDetailsModal({ card, isOpen, onClose }: CardDetailsModalProps) {
  const [showSensitive, setShowSensitive] = useState(false);
  const [sensitiveData, setSensitiveData] = useState<CardSensitive | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const cardId = card.card_id || card.id;

  // Helper to get the correct field from ZeroID response
  const getCardNumber = () => sensitiveData?.card_number || sensitiveData?.pan || '';
  const getExpiryDate = () => {
    if (sensitiveData?.expiry_date) return sensitiveData.expiry_date;
    if (sensitiveData?.expiry_month && sensitiveData?.expiry_year) {
      return `${sensitiveData.expiry_month}/${sensitiveData.expiry_year}`;
    }
    return '';
  };
  const getCVV = () => sensitiveData?.cvv || sensitiveData?.security_code || '';
  const getExpiryMonth = () => {
    if (sensitiveData?.expiry_month) return sensitiveData.expiry_month;
    if (sensitiveData?.expiry_date) {
      const parts = sensitiveData.expiry_date.split('/');
      return parts[0] || '';
    }
    return '';
  };
  const getExpiryYear = () => {
    if (sensitiveData?.expiry_year) return sensitiveData.expiry_year;
    if (sensitiveData?.expiry_date) {
      const parts = sensitiveData.expiry_date.split('/');
      return parts[1] || '';
    }
    return '';
  };

  const handleToggleSensitive = async () => {
    if (showSensitive) {
      setShowSensitive(false);
      return;
    }

    if (!sensitiveData) {
      setLoading(true);
      try {
        console.log(`[Modal] Fetching sensitive data for cardId: ${cardId}`);
        const data = await fetchCardSensitive(cardId);
        console.log(`[Modal] Sensitive data received:`, data);
        setSensitiveData(data);
      } catch (error) {
        console.error('Failed to fetch card details:', error);
        alert('Failed to load card details. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    setShowSensitive(true);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-2xl font-bold text-white">{card.title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Large Card Display */}
          <div className="relative w-full aspect-[1.586/1] rounded-3xl p-8 overflow-hidden bg-gradient-to-br from-gray-800 via-gray-900 to-black border border-gray-700 shadow-xl">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-violet-500/20 to-transparent rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-purple-500/20 to-transparent rounded-full blur-3xl" />
            </div>

            {/* Content */}
            <div className="relative z-10 h-full flex flex-col justify-between">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-2">Card Title</p>
                  <h3 className="text-2xl font-bold text-white">{card.title}</h3>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400 mb-1">Status</p>
                  <span className={cn(
                    'inline-block px-3 py-1 rounded-lg text-sm font-medium border',
                    card.status === 'active' ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                    card.status === 'frozen' ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' :
                    'bg-gray-500/20 border-gray-500/30 text-gray-400'
                  )}>
                    {card.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Card Number */}
              <div className="space-y-2">
                <p className="text-xs text-gray-400 uppercase tracking-widest">Card Number</p>
                <div className="flex items-center justify-between">
                  <p className="font-mono text-3xl text-white tracking-widest font-semibold">
                    {showSensitive && sensitiveData
                      ? formatCardNumber(getCardNumber())
                      : maskCardNumber(card.last_four || '')}
                  </p>
                  {showSensitive && sensitiveData && (
                    <button
                      onClick={() => copyToClipboard(getCardNumber(), 'pan')}
                      className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700 transition-colors"
                    >
                      {copied === 'pan' ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Footer Row */}
              <div className="flex items-end justify-between">
                <div className="flex gap-8">
                  {/* Expiry */}
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Expiry Date</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-2xl text-white">
                        {showSensitive && sensitiveData
                          ? getExpiryDate()
                          : '••/••'}
                      </p>
                      {showSensitive && sensitiveData && (
                        <button
                          onClick={() => copyToClipboard(getExpiryDate(), 'expiry')}
                          className="p-1.5 rounded-lg bg-gray-800/50 hover:bg-gray-700 transition-colors"
                        >
                          {copied === 'expiry' ? (
                            <Check className="h-3 w-3 text-green-400" />
                          ) : (
                            <Copy className="h-3 w-3 text-gray-400" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* CVV */}
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">CVV</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-2xl text-white">
                        {showSensitive && sensitiveData ? getCVV() : '•••'}
                      </p>
                      {showSensitive && sensitiveData && (
                        <button
                          onClick={() => copyToClipboard(getCVV(), 'cvv')}
                          className="p-1.5 rounded-lg bg-gray-800/50 hover:bg-gray-700 transition-colors"
                        >
                          {copied === 'cvv' ? (
                            <Check className="h-3 w-3 text-green-400" />
                          ) : (
                            <Copy className="h-3 w-3 text-gray-400" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Balance */}
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Available Balance</p>
                  <p className="text-3xl font-bold text-green-400">{formatCurrency(card.balance || 0)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sensitive Data Section */}
          <div className="space-y-4">
            <button
              onClick={handleToggleSensitive}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium hover:from-violet-600 hover:to-purple-700 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="animate-pulse">Loading...</span>
                </>
              ) : showSensitive ? (
                <>
                  <EyeOff className="h-5 w-5" />
                  Hide Sensitive Data
                </>
              ) : (
                <>
                  <Eye className="h-5 w-5" />
                  Show Sensitive Data (Full Card Details)
                </>
              )}
            </button>

            {/* Detailed Information */}
            {showSensitive && sensitiveData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-700">
                {/* Full PAN */}
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Full Card Number</p>
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-lg text-white break-all">{getCardNumber()}</p>
                    <button
                      onClick={() => copyToClipboard(getCardNumber(), 'full-pan')}
                      className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600 transition-colors flex-shrink-0 ml-2"
                    >
                      {copied === 'full-pan' ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expiry Month */}
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Expiry Month</p>
                  <p className="font-mono text-lg text-white">{sensitiveData.expiry_month}</p>
                </div>

                {/* Expiry Year */}
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Expiry Year</p>
                  <p className="font-mono text-lg text-white">{getExpiryYear()}</p>
                </div>

                {/* CVV */}
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">CVV/CVC</p>
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-lg text-white">{getCVV()}</p>
                    <button
                      onClick={() => copyToClipboard(getCVV(), 'full-cvv')}
                      className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600 transition-colors"
                    >
                      {copied === 'full-cvv' ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Card Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-700">
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Card ID</p>
                <p className="font-mono text-sm text-white break-all">{cardId}</p>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Status</p>
                <p className={cn(
                  'font-semibold capitalize',
                  card.status === 'active' ? 'text-green-400' :
                  card.status === 'frozen' ? 'text-blue-400' :
                  'text-gray-400'
                )}>
                  {card.status}
                </p>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Current Balance</p>
                <p className="text-xl font-bold text-green-400">{formatCurrency(card.balance || 0)}</p>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Currency</p>
                <p className="font-mono text-sm text-white">{card.currency || 'USD'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-800 p-4 bg-gray-800/30 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl bg-gray-800 border border-gray-700 text-white font-medium hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
