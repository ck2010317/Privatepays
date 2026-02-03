'use client';

import { useEffect, useState } from 'react';
import { Settings, Save, Loader2, DollarSign, Percent, AlertCircle, CheckCircle, Wallet } from 'lucide-react';

interface SettingsData {
  cardCreationFee: number;
  topUpFeePercent: number;
  topUpFeeFlat: number;
  minTopUp: number;
  maxTopUp: number;
  minDeposit: number;
  solanaWallet: string | null;
  maintenanceMode: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch settings');
      }

      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      setSettings(data);
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof SettingsData, value: string | number | boolean) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
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
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 mt-1">Configure your PrivatePay platform</p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          <span>Save Changes</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4 flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <span className="text-green-400">{success}</span>
        </div>
      )}

      {settings && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fees */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-green-400" />
              Fees & Commissions
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Card Creation Fee ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.cardCreationFee}
                  onChange={(e) => handleChange('cardCreationFee', parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-gray-500 text-xs mt-1">Flat fee charged for creating a new card</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Top-Up Fee (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.topUpFeePercent}
                  onChange={(e) => handleChange('topUpFeePercent', parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-gray-500 text-xs mt-1">Percentage fee charged on card top-ups</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Top-Up Flat Fee ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.topUpFeeFlat}
                  onChange={(e) => handleChange('topUpFeeFlat', parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-gray-500 text-xs mt-1">Flat fee added to every top-up (in addition to %)</p>
              </div>
            </div>
          </div>

          {/* Limits */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Percent className="w-5 h-5 mr-2 text-purple-400" />
              Limits
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Minimum Deposit ($)
                </label>
                <input
                  type="number"
                  step="1"
                  value={settings.minDeposit}
                  onChange={(e) => handleChange('minDeposit', parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Minimum Top-Up ($)
                </label>
                <input
                  type="number"
                  step="1"
                  value={settings.minTopUp}
                  onChange={(e) => handleChange('minTopUp', parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Maximum Top-Up ($)
                </label>
                <input
                  type="number"
                  step="1"
                  value={settings.maxTopUp}
                  onChange={(e) => handleChange('maxTopUp', parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          {/* Deposit Info */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 lg:col-span-2">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Wallet className="w-5 h-5 mr-2 text-purple-400" />
              Solana Deposit Wallet
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Your Solana Wallet Address
                </label>
                <input
                  type="text"
                  value={settings.solanaWallet || ''}
                  onChange={(e) => handleChange('solanaWallet', e.target.value)}
                  placeholder="Enter your Solana wallet address to receive deposits"
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
                />
                <p className="text-gray-500 text-xs mt-1">Users will send SOL to this address. Payments are automatically detected via Helius RPC.</p>
              </div>

              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <h4 className="text-purple-400 font-medium mb-2">How it works:</h4>
                <ul className="text-gray-400 text-sm space-y-1">
                  <li>• Users see your wallet address and QR code when creating cards</li>
                  <li>• They send SOL from their wallet to pay</li>
                  <li>• System automatically detects the payment</li>
                  <li>• Card is created automatically after payment confirmed</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Maintenance */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Maintenance Mode</h3>
                <p className="text-gray-400 text-sm mt-1">
                  When enabled, users will see a maintenance message and won't be able to perform actions
                </p>
              </div>
              <button
                onClick={() => handleChange('maintenanceMode', !settings.maintenanceMode)}
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  settings.maintenanceMode ? 'bg-yellow-500' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${
                    settings.maintenanceMode ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
