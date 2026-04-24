"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function ClientsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  if (isPending) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Clients</h1>
              <p className="text-muted-foreground mt-2">Manage your clients and their information</p>
            </div>
            <Button>
              <Plus className="size-4 mr-2" />
              Add Client
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>No Clients Yet</CardTitle>
              <CardDescription>Start by adding your first client</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Create and manage your clients here. Track their projects and communications all in one place.
              </p>
              <Button>
                <Plus className="size-4 mr-2" />
                Add Your First Client
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
