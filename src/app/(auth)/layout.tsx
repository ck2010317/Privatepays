'use client';

import { CreditCard } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-green-400 to-emerald-600 p-2 rounded-xl">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white">PrivatePay</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-gray-500 text-sm">
        <p>© {new Date().getFullYear()} PrivatePay. Your privacy matters.</p>
      </footer>
    </div>
  );
}
