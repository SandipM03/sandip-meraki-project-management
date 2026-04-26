
'use client';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
export default function LandingPage() {
  const router = useRouter();
  const session = useSession();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session.isPending) {
      if (session.data?.user) {
        router.push('/dashboard');
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
    <div className="min-h-screen bg-white">
  
  <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

      <div className="flex items-center gap-2">
        
        <span className="font-semibold text-lg text-gray-900">Meraki Workspace</span>
      </div>

      <div className="flex items-center gap-3">
       

        <button
          onClick={() => router.push('/signin')}
          className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm hover:opacity-90"
        >
          Get Started
        </button>
      </div>
    </div>
  </nav>


  <section className="pt-32 pb-20 px-6 relative overflow-hidden">
    

    <div className="absolute right-0 top-20 w-[500px] h-[500px] bg-gradient-to-br from-orange-200 to-red-200 rounded-full blur-3xl opacity-40"></div>

    <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">

      <div>
        <p className="text-sm text-orange-500 font-medium mb-4">
          Bring clarity to your team
        </p>

        <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 leading-tight mb-6">
          A workspace that keeps <br />
          <span className="text-orange-500">work, clients,</span> <br />
          and ownership in sync
        </h1>

        <p className="text-lg text-gray-600 mb-8 max-w-xl">
          Lightweight, transparent, and built for small teams. Track tasks,
          manage clients, and know exactly who owns what — without chaos.
        </p>


        <div className="flex flex-wrap gap-4 mb-8">
          <button
            onClick={() => router.push('/signin')}
            className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-4 rounded-xl text-lg font-medium shadow-md hover:opacity-90"
          >
            Get Started Free
          </button>
        </div>  
      </div>
      <div className="relative">
        <Image
          src="/imagebremove.png"
          alt="Dashboard Illustration"
          width={800}
          height={800}
          className="w-full h-auto relative z-10"
        />

      </div>
    </div>
  </section>
</div>
  );
}