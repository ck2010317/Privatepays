'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Copy, Check, AlertCircle, Wallet, RefreshCw, ExternalLink } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import QRCode from 'qrcode';

interface DepositInfo {
  wallet: string;
  solPrice: number;
  minDepositUsd: number;
  minDepositSol: number;
  solanaPayUrl: string;
  deposits: Array<{
    id: string;
    amountSol: number;
    amountUsd: number;
    status: string;
    createdAt: string;
  }>;
}

export function DepositModal() {
  const { depositModalOpen, setDepositModalOpen, user, updateUserBalance } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [depositInfo, setDepositInfo] = useState<DepositInfo | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ amountSol: number; amountUsd: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [walletAddress, setWalletAddress] = useState('');
  const [depositAmount, setDepositAmount] = useState('');

  useEffect(() => {
    if (depositModalOpen) {
      fetchDepositInfo();
    }
  }, [depositModalOpen]);

  useEffect(() => {
    if (depositInfo?.wallet) {
      generateQRCode(depositInfo.wallet);
    }
  }, [depositInfo?.wallet]);

  const generateQRCode = async (address: string) => {
    try {
      const qr = await QRCode.toDataURL(address, {
        width: 200,
        margin: 2,
        color: {
          dark: '#10b981',
          light: '#111827',
        },
      });
      setQrCode(qr);
    } catch (err) {
      console.error('Failed to generate QR code:', err);
    }
  };

  const fetchDepositInfo = async () => {
    setLoading(true);
    setError('');
    try {
      // This endpoint is no longer used - direct payment flow is active
      // Users now pay SOL directly for cards instead of depositing balance
      setLoading(false);
      return;
      
      // const res = await fetch('/api/user/deposit-info');
      // const data = await res.json();
      // if (res.ok) {
      //   setDepositInfo(data);
      // } else {
      //   setError(data.error || 'Failed to load deposit info');
      // }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (depositInfo?.wallet) {
      await navigator.clipboard.writeText(depositInfo.wallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const checkPayment = async () => {
    if (!walletAddress.trim()) {
      setError('Please enter your Solana wallet address');
      return;
    }

    setChecking(true);
    setError('');

    try {
      const res = await fetch('/api/user/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: walletAddress.trim(),
          amountUsd: depositAmount ? parseFloat(depositAmount) : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to check payment');
      }

      if (data.success) {
        setSuccess({
          amountSol: data.deposit.amountSol,
          amountUsd: data.deposit.amountUsd,
        });
        if (data.newBalance !== undefined) {
          updateUserBalance(data.newBalance);
        }
      } else {
        setError(data.message || 'No payment found. Please make sure you sent SOL to the correct address.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check payment');
    } finally {
      setChecking(false);
    }
  };

  const handleClose = () => {
    setDepositModalOpen(false);
    setError('');
    setSuccess(null);
    setWalletAddress('');
    setDepositAmount('');
  };

  const solAmount = depositAmount && depositInfo 
    ? (parseFloat(depositAmount) / depositInfo.solPrice).toFixed(6)
    : null;

  if (!depositModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative w-full max-w-lg bg-gray-900 rounded-2xl border border-gray-800 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-green-400" />
            Deposit SOL
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-500" />
            </div>
          ) : success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Deposit Confirmed!</h3>
              <p className="text-gray-400 mb-4">
                {success.amountSol.toFixed(6)} SOL (${success.amountUsd.toFixed(2)}) has been added to your account.
              </p>
              <p className="text-green-400 text-lg font-semibold mb-6">
                New Balance: ${user?.balance?.toFixed(2) || '0.00'}
              </p>
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Done
              </button>
            </div>
          ) : error && !depositInfo ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={fetchDepositInfo}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : depositInfo ? (
            <>
              {/* Price Info */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                <div>
                  <p className="text-gray-400 text-sm">Current SOL Price</p>
                  <p className="text-white text-xl font-bold">${depositInfo.solPrice}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">Min Deposit</p>
                  <p className="text-white">${depositInfo.minDepositUsd} ({depositInfo.minDepositSol} SOL)</p>
                </div>
              </div>

              {/* Amount Calculator */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  How much do you want to deposit? (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="100"
                    min={depositInfo.minDepositUsd}
                    className="w-full h-12 pl-8 pr-4 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all"
                  />
                </div>
                {solAmount && (
                  <p className="text-green-400 text-sm mt-2">
                    ≈ {solAmount} SOL
                  </p>
                )}
              </div>

              {/* QR Code and Address */}
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-4">Scan or copy the address below to send SOL:</p>
                
                {qrCode && (
                  <div className="inline-block p-4 bg-gray-800 rounded-xl mb-4">
                    <img src={qrCode} alt="Deposit Address QR Code" className="w-48 h-48" />
                  </div>
                )}

                <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-800 border border-gray-700">
                  <code className="flex-1 text-green-400 text-sm font-mono break-all text-left">
                    {depositInfo.wallet}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors flex-shrink-0"
                    title="Copy address"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Check Payment Section */}
              <div className="border-t border-gray-800 pt-6">
                <h4 className="text-white font-medium mb-3">Already sent? Check your payment:</h4>
                
                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div className="space-y-3">
                  <input
                    type="text"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="Your Solana wallet address (sender)"
                    className="w-full h-12 px-4 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all font-mono text-sm"
                  />

                  <button
                    onClick={checkPayment}
                    disabled={checking || !walletAddress.trim()}
                    className={cn(
                      'w-full h-12 rounded-xl bg-green-500 text-white font-medium transition-all flex items-center justify-center gap-2',
                      checking || !walletAddress.trim()
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-green-600'
                    )}
                  >
                    {checking ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Check Payment
                      </>
                    )}
                  </button>
                </div>

                <p className="text-gray-500 text-xs mt-3 text-center">
                  Enter the wallet address you sent SOL from to verify your payment
                </p>
              </div>

              {/* View on Explorer */}
              <a
                href={`https://solscan.io/account/${depositInfo.wallet}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View wallet on Solscan
              </a>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
