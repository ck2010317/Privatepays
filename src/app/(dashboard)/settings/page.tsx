'use client';

import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Building2, Percent, RefreshCw, Shield, Key, Globe } from 'lucide-react';
import { fetchVendors, fetchCommissions, fetchCurrencies } from '@/lib/api/client';
import { Vendor, CardCommission, Currency } from '@/lib/api/zeroid';
import { cn, formatCurrency } from '@/lib/utils';

export default function SettingsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [commissions, setCommissions] = useState<CardCommission[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'general' | 'vendors' | 'commissions'>('general');

  useEffect(() => {
    async function loadData() {
      try {
        const [vendorsData, commissionsData, currenciesData] = await Promise.all([
          fetchVendors(),
          fetchCommissions(),
          fetchCurrencies(),
        ]);
        setVendors(vendorsData);
        setCommissions(commissionsData);
        setCurrencies(currenciesData);
      } catch (error) {
        console.error('Failed to load settings data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const tabs = [
    { id: 'general', name: 'General', icon: SettingsIcon },
    { id: 'vendors', name: 'Vendors', icon: Building2 },
    { id: 'commissions', name: 'Commissions', icon: Percent },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Configure your account and view platform information</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.name}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Account Info */}
          <div className="p-6 rounded-2xl bg-gray-900 border border-gray-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-violet-500/10">
                <Shield className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Account Status</h3>
                <p className="text-sm text-gray-400">Your account information</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-800/50">
                <span className="text-gray-400">Account Type</span>
                <span className="px-3 py-1 rounded-lg bg-violet-500/20 text-violet-400 text-sm font-medium border border-violet-500/30">
                  B2B Partner
                </span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-800/50">
                <span className="text-gray-400">KYC Status</span>
                <span className="px-3 py-1 rounded-lg bg-green-500/20 text-green-400 text-sm font-medium border border-green-500/30">
                  Not Required
                </span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-800/50">
                <span className="text-gray-400">API Rate Limit</span>
                <span className="text-white font-medium">100 requests/min</span>
              </div>
            </div>
          </div>

          {/* API Info */}
          <div className="p-6 rounded-2xl bg-gray-900 border border-gray-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Key className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">API Configuration</h3>
                <p className="text-sm text-gray-400">Your API connection details</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gray-800/50">
                <p className="text-sm text-gray-400 mb-2">Base URL</p>
                <code className="text-sm text-violet-400 font-mono">
                  https://app.zeroid.cc/api/b2b
                </code>
              </div>
              <div className="p-4 rounded-xl bg-gray-800/50">
                <p className="text-sm text-gray-400 mb-2">API Key</p>
                <code className="text-sm text-white font-mono">
                  ••••••••••••••••••••••••••••••••
                </code>
              </div>
              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-sm text-yellow-400">
                  Keep your API key secure and never share it publicly.
                </p>
              </div>
            </div>
          </div>

          {/* Currencies */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-gray-900 border border-gray-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-green-500/10">
                <Globe className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Supported Currencies</h3>
                <p className="text-sm text-gray-400">Available currencies for transactions</p>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse p-4 rounded-xl bg-gray-800/50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gray-700" />
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-700 rounded w-20" />
                        <div className="h-3 bg-gray-700 rounded w-16" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {currencies.map((currency) => (
                  <div
                    key={currency.id}
                    className="flex items-center gap-3 p-4 rounded-xl bg-gray-800/50 border border-gray-700/50"
                  >
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                      {currency.symbol}
                    </div>
                    <div>
                      <p className="font-medium text-white">{currency.name}</p>
                      <p className="text-sm text-gray-400">{currency.code.toUpperCase()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'vendors' && (
        <div className="p-6 rounded-2xl bg-gray-900 border border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-blue-500/10">
              <Building2 className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Card Vendors</h3>
              <p className="text-sm text-gray-400">Available card providers</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse p-4 rounded-xl bg-gray-800/50">
                  <div className="space-y-2">
                    <div className="h-5 bg-gray-700 rounded w-1/3" />
                    <div className="h-4 bg-gray-700 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : vendors.length > 0 ? (
            <div className="space-y-4">
              {vendors.map((vendor) => (
                <div
                  key={vendor.id}
                  className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-white">{vendor.name}</h4>
                      <p className="text-sm text-gray-400 mt-1">{vendor.description}</p>
                    </div>
                    <span className="px-3 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium border border-green-500/30">
                      Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No vendors available</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'commissions' && (
        <div className="p-6 rounded-2xl bg-gray-900 border border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-orange-500/10">
              <Percent className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Card Commissions</h3>
              <p className="text-sm text-gray-400">Fee structure for card operations</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse p-4 rounded-xl bg-gray-800/50">
                  <div className="space-y-2">
                    <div className="h-5 bg-gray-700 rounded w-1/4" />
                    <div className="h-4 bg-gray-700 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : commissions.length > 0 ? (
            <div className="space-y-4">
              {commissions.map((commission) => (
                <div
                  key={commission.id}
                  className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-white">{commission.name}</h4>
                    <span className="text-xl font-bold text-violet-400">
                      {commission.commission_rate}%
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>Min: {formatCurrency(commission.min_amount)}</span>
                    <span>•</span>
                    <span>Max: {formatCurrency(commission.max_amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Percent className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No commission data available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
