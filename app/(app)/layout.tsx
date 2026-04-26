'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { useSession } from '@/lib/auth-client';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const session = useSession();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session.isPending) {
      if (!session.data?.user) {
        router.push('/signin');
      } else {
        setIsLoading(false);
      }
    }
  }, [session.isPending, session.data, router]);

  if (isLoading || session.isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}
