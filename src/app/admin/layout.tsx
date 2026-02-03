'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  CreditCard, 
  LayoutDashboard, 
  Users, 
  FileText, 
  Wallet, 
  Settings, 
  LogOut,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: Users, label: 'Users', href: '/admin/users' },
  { icon: FileText, label: 'Card Requests', href: '/admin/card-requests' },
  { icon: TrendingUp, label: 'Top-Up Requests', href: '/admin/topup-requests' },
  { icon: Wallet, label: 'Deposits', href: '/admin/deposits' },
  { icon: Settings, label: 'Settings', href: '/admin/settings' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser } = useAppStore();

  useEffect(() => {
    // Check if user is authenticated and is admin
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        
        if (!res.ok || data.user?.role !== 'admin') {
          router.push('/login');
          return;
        }
        
        setUser(data.user);
      } catch (error) {
        router.push('/login');
      }
    };

    checkAuth();
  }, [router, setUser]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800/50 border-r border-gray-700/50 flex flex-col">
        <div className="p-6">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-green-400 to-emerald-600 p-2 rounded-xl">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-white">PrivatePay</span>
              <span className="block text-xs text-green-400">Admin Panel</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-green-500/20 text-green-400'
                    : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-700/50">
          <div className="flex items-center space-x-3 px-4 py-2 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
              {user.name?.[0] || user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{user.name || 'Admin'}</p>
              <p className="text-gray-400 text-xs truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
