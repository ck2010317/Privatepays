'use client';

import { useState } from 'react';
import { Snowflake, Sun, CreditCard as CardIcon, TrendingUp, Maximize2 } from 'lucide-react';
import { Card } from '@/lib/api/zeroid';
import { cn, maskCardNumber, getStatusColor, formatCurrency } from '@/lib/utils';
import { freezeCard, unfreezeCard } from '@/lib/api/client';
import { useAppStore } from '@/lib/store';
import { CardDetailsModal } from '@/components/modals/card-details-modal';

interface CreditCardProps {
  card: Card;
  onUpdate?: () => void;
}

export function CreditCardComponent({ card, onUpdate }: CreditCardProps) {
  const { setSelectedCard, setTopUpModalOpen } = useAppStore();
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const cardId = card.card_id || card.id;
  const isFrozen = card.status === 'frozen';

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

  const handleOpenModal = () => {
    setShowDetailsModal(true);
  };

  return (
    <>
      {/* Card Details Modal */}
      <CardDetailsModal
        card={card}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
      />

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
                {maskCardNumber(card.last_four || '')}
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-end justify-between">
              <div className="flex gap-6">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Expiry</p>
                  <p className="font-mono text-sm text-white">••/••</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">CVV</p>
                  <p className="font-mono text-sm text-white">•••</p>
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
            onClick={handleOpenModal}
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm hover:from-violet-600 hover:to-purple-700 transition-colors font-medium"
          >
            <Maximize2 className="h-4 w-4" />
            View Full Details
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
    </>
  );
}
