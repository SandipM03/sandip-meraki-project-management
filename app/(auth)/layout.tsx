'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession } from '@/lib/auth-client';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const session = useSession();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session.isPending && session.data?.user) {
      router.push('/dashboard');
    } else if (!session.isPending) {
      setIsLoading(false);
    }
  }, [session.isPending, session.data, router]);

  if (isLoading || session.isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return <>{children}</>;
}
