'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  CreditCard,
  LayoutDashboard,
  History,
  Receipt,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Cards', href: '/cards', icon: CreditCard },
  { name: 'Transactions', href: '/transactions', icon: History },
  { name: 'Payments', href: '/wallet', icon: Receipt },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen, toggleSidebar, user, setUser } = useAppStore();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-gray-900 border-r border-gray-800 transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-20'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-800">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600">
              <Shield className="h-5 w-5 text-white" />
            </div>
            {sidebarOpen && (
              <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                PrivatePay
              </span>
            )}
          </Link>
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-white border border-green-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                )}
              >
                <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-green-400')} />
                {sidebarOpen && <span className="font-medium">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="border-t border-gray-800 p-4">
          {sidebarOpen ? (
            <div className="space-y-3">
              {/* User Balance */}
              <div className="rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 p-4">
                <p className="text-sm text-gray-400 mb-1">Account Balance</p>
                <p className="text-xl font-bold text-green-400">
                  ${(user?.balance || 0).toFixed(2)}
                </p>
              </div>
              
              {/* User Info */}
              <div className="flex items-center gap-3 px-2">
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {user?.name?.[0] || user?.email[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-gray-500 text-xs truncate">{user?.email}</p>
                </div>
              </div>
              
              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
