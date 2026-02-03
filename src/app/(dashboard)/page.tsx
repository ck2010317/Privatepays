'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect to /dashboard
export default function HomePage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
    </div>
  );
}
