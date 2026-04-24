"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function TasksPage() {
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
              <h1 className="text-3xl font-bold">Tasks</h1>
              <p className="text-muted-foreground mt-2">Track and manage all your tasks</p>
            </div>
            <Button>
              <Plus className="size-4 mr-2" />
              New Task
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>No Tasks Yet</CardTitle>
              <CardDescription>Create your first task to get started</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Tasks help you break down your work into manageable pieces. Create tasks to track progress on your projects.
              </p>
              <Button>
                <Plus className="size-4 mr-2" />
                Create Your First Task
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
