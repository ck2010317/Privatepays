'use client';

import { useState } from 'react';
import { Eye, EyeOff, Snowflake, Sun, CreditCard as CardIcon, MoreVertical, TrendingUp } from 'lucide-react';
import { Card, CardSensitive } from '@/lib/api/zeroid';
import { cn, maskCardNumber, formatCardNumber, getStatusColor, formatCurrency } from '@/lib/utils';
import { fetchCardSensitive, freezeCard, unfreezeCard } from '@/lib/api/client';
import { useAppStore } from '@/lib/store';

interface CreditCardProps {
  card: Card;
  onUpdate?: () => void;
}

export function CreditCardComponent({ card, onUpdate }: CreditCardProps) {
  const { setSelectedCard, setTopUpModalOpen } = useAppStore();
  const [showDetails, setShowDetails] = useState(false);
  const [sensitiveData, setSensitiveData] = useState<CardSensitive | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const cardId = card.card_id || card.id;
  const isFrozen = card.status === 'frozen';

  const handleShowDetails = async () => {
    if (showDetails) {
      setShowDetails(false);
      return;
    }

    if (!sensitiveData) {
      setLoading(true);
      try {
        const data = await fetchCardSensitive(cardId);
        setSensitiveData(data);
      } catch (error) {
        console.error('Failed to fetch card details:', error);
      } finally {
        setLoading(false);
      }
    }
    setShowDetails(true);
  };

  const handleFreezeToggle = async () => {
    setActionLoading(true);
    try {
      if (isFrozen) {
        await unfreezeCard(cardId);
      } else {
        await freezeCard(cardId);
      }
      onUpdate?.();
    } catch (error) {
      console.error('Failed to toggle freeze:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTopUp = () => {
    setSelectedCard(card);
    setTopUpModalOpen(true);
  };

  return (
    <div className="relative group">
      {/* Card */}
      <div
        className={cn(
          'relative w-full aspect-[1.586/1] rounded-2xl p-6 overflow-hidden transition-all duration-300',
          'bg-gradient-to-br from-gray-800 via-gray-900 to-black',
          'border border-gray-700 hover:border-violet-500/50',
          'shadow-xl hover:shadow-2xl hover:shadow-violet-500/10',
          isFrozen && 'opacity-75'
        )}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-500/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-500/20 to-transparent rounded-full blur-3xl" />
        </div>

        {/* Frozen Overlay */}
        {isFrozen && (
          <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30">
              <Snowflake className="h-5 w-5 text-blue-400" />
              <span className="text-blue-400 font-medium">Card Frozen</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="relative z-20 h-full flex flex-col justify-between">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">{card.title}</p>
              <div className={cn('inline-flex px-2 py-0.5 rounded-lg text-xs font-medium border', getStatusColor(card.status))}>
                {card.status}
              </div>
            </div>
            <CardIcon className="h-8 w-8 text-violet-400" />
          </div>

          {/* Card Number */}
          <div className="space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Card Number</p>
            <p className="font-mono text-lg text-white tracking-widest">
              {showDetails && sensitiveData
                ? formatCardNumber(sensitiveData.pan)
                : maskCardNumber(card.last_four || '')}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-end justify-between">
            <div className="flex gap-6">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Expiry</p>
                <p className="font-mono text-sm text-white">
                  {showDetails && sensitiveData
                    ? `${sensitiveData.expiry_month}/${sensitiveData.expiry_year}`
                    : '••/••'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">CVV</p>
                <p className="font-mono text-sm text-white">
                  {showDetails && sensitiveData ? sensitiveData.cvv : '•••'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Balance</p>
              <p className="text-lg font-semibold text-white">
                {formatCurrency(card.balance || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={handleShowDetails}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white hover:bg-gray-700 transition-colors"
        >
          {loading ? (
            <span className="animate-pulse">Loading...</span>
          ) : showDetails ? (
            <>
              <EyeOff className="h-4 w-4" />
              Hide Details
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              Show Details
            </>
          )}
        </button>
        <button
          onClick={handleFreezeToggle}
          disabled={actionLoading}
          className={cn(
            'flex items-center justify-center gap-2 h-10 px-4 rounded-xl border text-sm transition-colors',
            isFrozen
              ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
          )}
        >
          {isFrozen ? (
            <>
              <Sun className="h-4 w-4" />
              Unfreeze
            </>
          ) : (
            <>
              <Snowflake className="h-4 w-4" />
              Freeze
            </>
          )}
        </button>
        <button
          onClick={handleTopUp}
          className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400 text-sm hover:bg-violet-500/20 transition-colors"
        >
          <TrendingUp className="h-4 w-4" />
          Top Up
        </button>
      </div>
    </div>
  );
}
