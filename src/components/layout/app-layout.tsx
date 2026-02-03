'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { CreateCardModal } from '@/components/modals/create-card-modal';
import { TopUpModal } from '@/components/modals/topup-modal';
import { DepositModal } from '@/components/modals/deposit-modal';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { sidebarOpen, user, setUser } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();

        if (!res.ok) {
          router.push('/login');
          return;
        }

        // Redirect admin to admin dashboard
        if (data.user.role === 'admin') {
          router.push('/admin');
          return;
        }

        setUser(data.user);
      } catch (error) {
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, setUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Sidebar />
      <div
        className={cn(
          'transition-all duration-300',
          sidebarOpen ? 'ml-64' : 'ml-20'
        )}
      >
        <Header />
        <main className="p-6">{children}</main>
      </div>
      
      {/* Modals */}
      <CreateCardModal />
      <TopUpModal />
      <DepositModal />
    </div>
  );
}
