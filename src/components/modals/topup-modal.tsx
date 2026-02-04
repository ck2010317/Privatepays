'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, TrendingUp, AlertCircle, Check, Copy, Clock } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';

interface PaymentOrder {
  id: string;
  type: string;
  amountUsd: number;
  amountSol: number;
  solPrice: number;
  topUpAmount: number | null;
  status: string;
  expectedWallet: string;
  expiresAt: string;
}

interface PaymentInfo {
  walletAddress: string;
  amountSol: string;
  amountUsd: string;
  solPrice: string;
  expiresAt: string;
  breakdown: {
    cardFee: string;
    topUpAmount: string;
    topUpFee: string;
    total: string;
  };
}

interface CardDetails {
  id: string;
  title: string;
  balance: number;
  status: string;
}

export function TopUpModal() {
  const { topUpModalOpen, setTopUpModalOpen, selectedCard } = useAppStore();
  const [step, setStep] = useState<'form' | 'payment' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [topUpFeePercent, setTopUpFeePercent] = useState(2.5);
  const [topUpFeeFlat, setTopUpFeeFlat] = useState(2);
  const [copied, setCopied] = useState(false);

  // Payment state
  const [paymentOrder, setPaymentOrder] = useState<PaymentOrder | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [updatedCard, setUpdatedCard] = useState<CardDetails | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [checking, setChecking] = useState(false);

  const [formData, setFormData] = useState({
    amount: '50',
  });

  // Fetch settings
  useEffect(() => {
    if (topUpModalOpen) {
      fetch('/api/user/settings')
        .then(res => res.json())
        .then(data => {
          if (data.topUpFeePercent) setTopUpFeePercent(data.topUpFeePercent);
          if (data.topUpFeeFlat) setTopUpFeeFlat(data.topUpFeeFlat);
        })
        .catch(console.error);
    }
  }, [topUpModalOpen]);

  // Countdown timer
  useEffect(() => {
    if (paymentInfo && step === 'payment') {
      const interval = setInterval(() => {
        const expiry = new Date(paymentInfo.expiresAt).getTime();
        const now = Date.now();
        const diff = Math.max(0, Math.floor((expiry - now) / 1000));
        setTimeLeft(diff);

        if (diff === 0) {
          setError('Payment time expired. Please create a new order.');
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [paymentInfo, step]);

  // Check payment status
  const checkPaymentStatus = useCallback(async () => {
    if (!paymentOrder || step !== 'payment' || checking) return;

    setChecking(true);
    try {
      const res = await fetch(`/api/payment-orders/${paymentOrder.id}`);
      const data = await res.json();

      if (data.order?.status === 'completed') {
        setUpdatedCard(data.card);
        setStep('success');
      } else if (data.order?.status === 'failed') {
        setError('Payment processing failed. Please contact support.');
      } else if (data.order?.status === 'expired') {
        setError('Payment time expired. Please create a new order.');
      }
    } catch (err) {
      console.error('Check payment error:', err);
    } finally {
      setChecking(false);
    }
  }, [paymentOrder, step, checking]);

  // Poll for payment every 5 seconds
  useEffect(() => {
    if (step === 'payment' && paymentOrder && timeLeft > 0) {
      const interval = setInterval(checkPaymentStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [step, paymentOrder, timeLeft, checkPaymentStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard) return;

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/payment-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'card_topup',
          cardId: selectedCard.id,
          topUpAmount: parseFloat(formData.amount),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create payment order');
      }

      setPaymentOrder(data.order);
      setPaymentInfo(data.payment);
      setStep('payment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setTopUpModalOpen(false);
    setError('');
    setStep('form');
    setPaymentOrder(null);
    setPaymentInfo(null);
    setUpdatedCard(null);
    setFormData({ amount: '50' });
  };

  if (!topUpModalOpen || !selectedCard) return null;

  const amount = parseFloat(formData.amount) || 0;
  // Calculate fee from the amount (fee is deducted from the amount user is paying)
  const topUpFee = (amount * topUpFeePercent / 100) + topUpFeeFlat;
  // What will be loaded on card = amount - fee
  const amountReceivedOnCard = amount - topUpFee;
  // Total to pay is just the amount (fee is already included in the amount)
  const totalUsd = amount;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative w-full max-w-md bg-gray-900 rounded-2xl border border-gray-800 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {step === 'form' && 'Top Up Card'}
              {step === 'payment' && 'Complete Payment'}
              {step === 'success' && 'Top Up Complete!'}
            </h2>
            <p className="text-sm text-gray-400 mt-1">{selectedCard.title}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Success State */}
          {step === 'success' && updatedCard && (
            <div className="text-center py-6">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Top Up Complete!</h3>
              <p className="text-gray-400 mb-6">
                Added <span className="text-green-400 font-semibold">${paymentOrder?.topUpAmount?.toFixed(2)}</span> to your card.
              </p>
              
              <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700 text-left space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-400">New Balance</span>
                  <span className="text-green-400 font-semibold">${updatedCard.balance.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition-all"
              >
                Done
              </button>
            </div>
          )}

          {/* Payment State */}
          {step === 'payment' && paymentInfo && (
            <div className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Timer */}
              <div className={cn(
                "flex items-center justify-center gap-2 p-3 rounded-xl",
                timeLeft < 300 ? "bg-red-500/10 border border-red-500/20" : "bg-yellow-500/10 border border-yellow-500/20"
              )}>
                <Clock className={cn("h-4 w-4", timeLeft < 300 ? "text-red-400" : "text-yellow-400")} />
                <span className={cn("font-mono font-bold", timeLeft < 300 ? "text-red-400" : "text-yellow-400")}>
                  {formatTime(timeLeft)}
                </span>
                <span className="text-gray-400 text-sm">remaining</span>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center p-6 rounded-xl bg-white">
                <QRCodeSVG
                  value={`solana:${paymentInfo.walletAddress}?amount=${paymentInfo.amountSol}`}
                  size={200}
                  level="H"
                />
              </div>

              {/* Amount to pay */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                <p className="text-gray-400 text-sm mb-1">Send exactly</p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-white">{paymentInfo.amountSol} SOL</span>
                  <span className="text-gray-400">≈ ${paymentInfo.amountUsd}</span>
                </div>
              </div>

              {/* Wallet Address */}
              <div>
                <p className="text-sm text-gray-400 mb-2">To this address:</p>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-800 border border-gray-700">
                  <code className="flex-1 text-sm text-white break-all font-mono">
                    {paymentInfo.walletAddress}
                  </code>
                  <button
                    onClick={() => copyToClipboard(paymentInfo.walletAddress)}
                    className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Amount to Pay</span>
                  <span className="text-white">${paymentInfo.breakdown.topUpAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Fee ({topUpFeePercent}% + ${topUpFeeFlat})</span>
                  <span className="text-yellow-400">-${paymentInfo.breakdown.topUpFee}</span>
                </div>
                <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between font-semibold">
                  <span className="text-white">You'll Receive on Card</span>
                  <span className="text-green-400">${(parseFloat(paymentInfo.breakdown.topUpAmount) - parseFloat(paymentInfo.breakdown.topUpFee)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>SOL Price</span>
                  <span>${paymentInfo.solPrice}</span>
                </div>
              </div>

              {/* Checking status */}
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Waiting for payment...</span>
              </div>

              <button
                onClick={checkPaymentStatus}
                disabled={checking}
                className="w-full px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white hover:bg-gray-700 transition-colors text-sm"
              >
                {checking ? 'Checking...' : "I've sent the payment"}
              </button>
            </div>
          )}

          {/* Form State */}
          {step === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Card Info */}
              <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Current Card Balance</span>
                  <span className="text-white font-semibold">${(selectedCard.balance || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Top-Up Amount (USD)
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="50"
                  min="10"
                  required
                  className="w-full h-11 px-4 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum: $10</p>
              </div>

              {/* Cost Breakdown */}
              <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Amount to Pay</span>
                  <span className="text-white font-semibold">${amount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Fee ({topUpFeePercent}% + ${topUpFeeFlat})</span>
                  <span className="text-yellow-400">-${topUpFee.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-700 pt-2 mt-2 flex items-center justify-between font-semibold">
                  <span className="text-white">You'll Receive on Card</span>
                  <span className="text-green-400">${amountReceivedOnCard.toFixed(2)}</span>
                </div>
                <div className="text-xs text-gray-500 pt-2">
                  New Card Balance: ${((selectedCard.balance || 0) + amountReceivedOnCard).toFixed(2)}
                </div>
              </div>

              {/* Info notice */}
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-green-300">
                  💡 You&apos;ll pay with <strong>SOL</strong> on Solana blockchain. QR code will be shown next.
                </p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || amount < 10}
                className={cn(
                  'w-full h-11 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium transition-all flex items-center justify-center gap-2',
                  (loading || amount < 10)
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/25'
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Order...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4" />
                    Continue to Payment
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
