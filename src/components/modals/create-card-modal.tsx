'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, CreditCard, AlertCircle, Check, Copy, Clock, Shield } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';

interface PaymentOrder {
  id: string;
  type: string;
  amountUsd: number;
  amountSol: number;
  solPrice: number;
  cardTitle: string | null;
  topUpAmount: number | null;
  status: string;
  expectedWallet: string;
  expiresAt: string;
  createdCardId: string | null;
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

export function CreateCardModal() {
  const { createCardModalOpen, setCreateCardModalOpen } = useAppStore();
  const [step, setStep] = useState<'form' | 'payment' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cardFee, setCardFee] = useState(0);
  const [topUpFeePercent, setTopUpFeePercent] = useState(2.5);
  const [topUpFeeFlat, setTopUpFeeFlat] = useState(2);
  const [copied, setCopied] = useState(false);

  // Verification state - REMOVED (integrated into single payment)
  // Token verification now happens during payment processing

  // Payment state
  const [paymentOrder, setPaymentOrder] = useState<PaymentOrder | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [createdCard, setCreatedCard] = useState<CardDetails | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [checking, setChecking] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    email: '',
    phoneNumber: '',
    amount: '15', // Default $15 initial top-up
  });

  // Reset form when modal opens
  useEffect(() => {
    if (createCardModalOpen) {
      setStep('form');
      setFormData({ title: '', email: '', phoneNumber: '', amount: '15' });
      setError('');
    }
  }, [createCardModalOpen]);

  // Fetch settings
  useEffect(() => {
    if (createCardModalOpen) {
      fetch('/api/user/settings')
        .then(res => res.json())
        .then(data => {
          if (data.topUpFeePercent) setTopUpFeePercent(data.topUpFeePercent);
          if (data.topUpFeeFlat) setTopUpFeeFlat(data.topUpFeeFlat);
        })
        .catch(console.error);
    }
  }, [createCardModalOpen]);

  // Payment countdown timer
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

  // Check payment status periodically
  const checkPaymentStatus = useCallback(async () => {
    if (!paymentOrder || step !== 'payment' || checking) return;

    setChecking(true);
    try {
      const res = await fetch(`/api/payment-orders/${paymentOrder.id}`);
      const data = await res.json();

      if (data.order?.status === 'completed') {
        setCreatedCard(data.card);
        setStep('success');
      } else if (data.order?.status === 'failed') {
        setError(data.error || 'Payment processing failed. Make sure you have the required tokens.');
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
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/payment-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'card_creation',
          cardTitle: formData.title,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
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
    setCreateCardModalOpen(false);
    setError('');
    setStep('verification');
    setVerificationOrder(null);
    setVerificationInfo(null);
    setTokenVerified(false);
    setPaymentOrder(null);
    setPaymentInfo(null);
    setCreatedCard(null);
    setFormData({ title: '', email: '', phoneNumber: '', amount: '50' });
  };

  if (!createCardModalOpen) return null;

  const amount = parseFloat(formData.amount) || 0;
  const topUpFee = amount > 0 ? (amount * topUpFeePercent / 100) + topUpFeeFlat : 0;
  const totalUsd = amount + topUpFee;

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
          <h2 className="text-xl font-semibold text-white">
            {step === 'verification' && 'Verify Token Ownership'}
            {step === 'form' && 'Create New Card'}
            {step === 'payment' && 'Complete Payment'}
            {step === 'success' && 'Card Created!'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Verification State */}
          {step === 'verification' && !tokenVerified && (
            <div className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {!verificationInfo && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-violet-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">Verify Token Ownership</h3>
                  <p className="text-gray-400 mb-6 text-sm">
                    To create a card, you must own at least <strong>1000 tokens</strong> of <code className="bg-gray-800 px-2 py-1 rounded text-xs text-violet-300">DrnF17MbiKXu7gVyfL13UydVvhFTSM7DDWN3Ui8npump</code>
                  </p>
                  
                  <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 mb-6">
                    <p className="text-sm text-violet-300 mb-2">
                      💡 <strong>How it works:</strong>
                    </p>
                    <ul className="text-xs text-gray-400 space-y-1 text-left">
                      <li>• Send $5 SOL to verify your wallet</li>
                      <li>• We check if you hold 1000+ tokens</li>
                      <li>• Once verified, you can create your card</li>
                    </ul>
                  </div>

                  <button
                    onClick={startVerification}
                    disabled={loading}
                    className={cn(
                      'w-full h-11 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium transition-all flex items-center justify-center gap-2',
                      loading
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/25'
                    )}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Starting Verification...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4" />
                        Verify Now ($5)
                      </>
                    )}
                  </button>
                </div>
              )}

              {verificationInfo && (
                <div className="space-y-4">
                  {/* Timer */}
                  <div className={cn(
                    "flex items-center justify-center gap-2 p-3 rounded-xl",
                    verificationTimeLeft < 300 ? "bg-red-500/10 border border-red-500/20" : "bg-yellow-500/10 border border-yellow-500/20"
                  )}>
                    <Clock className={cn("h-4 w-4", verificationTimeLeft < 300 ? "text-red-400" : "text-yellow-400")} />
                    <span className={cn("font-mono font-bold", verificationTimeLeft < 300 ? "text-red-400" : "text-yellow-400")}>
                      {Math.floor(verificationTimeLeft / 60)}:{(verificationTimeLeft % 60).toString().padStart(2, '0')}
                    </span>
                    <span className="text-gray-400 text-sm">remaining</span>
                  </div>

                  {/* QR Code */}
                  <div className="flex flex-col items-center p-6 rounded-xl bg-white">
                    <QRCodeSVG
                      value={`solana:${verificationInfo.walletAddress}?amount=${verificationInfo.amountSol}`}
                      size={200}
                      level="H"
                    />
                  </div>

                  {/* Amount to pay */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20">
                    <p className="text-gray-400 text-sm mb-1">Send exactly</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-white">{verificationInfo.amountSol} SOL</span>
                      <span className="text-gray-400">≈ ${verificationInfo.amountUsd}</span>
                    </div>
                  </div>

                  {/* Wallet Address */}
                  <div>
                    <p className="text-sm text-gray-400 mb-2">To this address:</p>
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-800 border border-gray-700">
                      <code className="flex-1 text-xs text-white break-all font-mono">
                        {verificationInfo.walletAddress}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(verificationInfo.walletAddress);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
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

                  {/* Checking status */}
                  <div className="flex items-center justify-center gap-2 text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Waiting for payment...</span>
                  </div>

                  <button
                    onClick={checkVerificationStatus}
                    disabled={verificationChecking}
                    className="w-full px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white hover:bg-gray-700 transition-colors text-sm"
                  >
                    {verificationChecking ? 'Checking...' : "I've sent the payment"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Success State */}
          {step === 'success' && createdCard && (
            <div className="text-center py-6">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Card Created!</h3>
              <p className="text-gray-400 mb-6">
                Your card <span className="text-white font-medium">{createdCard.title}</span> is ready to use.
              </p>
              
              <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700 text-left space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-400">Card Balance</span>
                  <span className="text-green-400 font-semibold">${createdCard.balance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <span className="text-green-400 capitalize">{createdCard.status}</span>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition-all"
              >
                View My Cards
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
              <div className="p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20">
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
                  <span className="text-gray-400">Card Creation Fee</span>
                  <span className="text-white">${paymentInfo.breakdown.cardFee}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Initial Balance</span>
                  <span className="text-white">${paymentInfo.breakdown.topUpAmount}</span>
                </div>
                {parseFloat(paymentInfo.breakdown.topUpFee) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Top-up Fee</span>
                    <span className="text-white">${paymentInfo.breakdown.topUpFee}</span>
                  </div>
                )}
                <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between font-semibold">
                  <span className="text-white">Total</span>
                  <span className="text-green-400">${paymentInfo.breakdown.total}</span>
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

              {/* Card Title */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Card Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="My Shopping Card"
                  required
                  className="w-full h-11 px-4 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@example.com"
                  required
                  className="w-full h-11 px-4 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="+1234567890"
                  required
                  className="w-full h-11 px-4 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                />
              </div>

              {/* Initial Balance */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Initial Balance (USD)
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="50"
                  min="0"
                  className="w-full h-11 px-4 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">Optional - you can top up later</p>
              </div>

              {/* Cost Breakdown */}
              <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Card Creation Fee</span>
                  <span className="text-white">$0.00</span>
                </div>
                {amount > 0 && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Initial Balance</span>
                      <span className="text-white">${amount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Top-up Fee ({topUpFeePercent}% + ${topUpFeeFlat})</span>
                      <span className="text-white">${topUpFee.toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="border-t border-gray-700 pt-2 mt-2 flex items-center justify-between font-semibold">
                  <span className="text-white">Total to Pay</span>
                  <span className="text-green-400">${(amount + topUpFee).toFixed(2)}</span>
                </div>
              </div>

              {/* Info notice */}
              <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <p className="text-sm text-violet-300">
                  💡 You&apos;ll pay with <strong>SOL</strong> on Solana blockchain. QR code and wallet address will be shown after clicking Continue.
                </p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !formData.title || !formData.email || !formData.phoneNumber}
                className={cn(
                  'w-full h-11 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium transition-all flex items-center justify-center gap-2',
                  (loading || !formData.title || !formData.email || !formData.phoneNumber)
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/25'
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Order...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
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
