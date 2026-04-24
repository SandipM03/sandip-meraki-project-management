"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  ListFilter,
  RefreshCw,
} from "lucide-react";

type TeamTask = {
  id: string;
  title: string;
  status: "TODO" | "DOING";
  dueDate: string | null;
  updatedAt: string;
};

type TeamMember = {
  userId: string;
  name: string | null;
  email: string;
  activeTaskCount: number;
  overdueCount: number;
  workload: "light" | "medium" | "heavy";
  lastActivityAt: string | null;
  tasks: TeamTask[];
};

type TeamVisibilityResponse = {
  data: {
    currentUserId: string;
    members: TeamMember[];
  };
};

function workloadMeta(workload: TeamMember["workload"]) {
  if (workload === "light") {
    return { icon: "🟢", label: "Light" };
  }

  if (workload === "medium") {
    return { icon: "🟡", label: "Medium" };
  }

  return { icon: "🔴", label: "Heavy" };
}

function statusLabel(status: TeamTask["status"]) {
  return status === "DOING" ? "Doing" : "Todo";
}

function formatRelativeTime(value: string | null): string {
  if (!value) {
    return "No recent activity";
  }

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return "Updated just now";
  }

  if (diffMinutes < 60) {
    return `Updated ${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `Updated ${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `Updated ${diffDays}d ago`;
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) {
    return false;
  }

  return new Date(dueDate).getTime() < Date.now();
}

export default function TeamPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"all" | "mine">("all");
  const [isLoadingBoard, setIsLoadingBoard] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (!session) {
      return;
    }

    let isCancelled = false;

    const loadBoard = async () => {
      try {
        setIsLoadingBoard(true);
        setError(null);

        const response = await fetch("/api/team/visibility", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (response.status === 401) {
          router.push("/login");
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to load team visibility");
        }

        const payload = (await response.json()) as TeamVisibilityResponse;

        if (isCancelled) {
          return;
        }

        setCurrentUserId(payload.data.currentUserId);
        setMembers(payload.data.members);
      } catch {
        if (!isCancelled) {
          setError("Could not load shared team visibility.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingBoard(false);
        }
      }
    };

    loadBoard();

    return () => {
      isCancelled = true;
    };
  }, [session, router]);

  const visibleMembers = useMemo(() => {
    if (viewMode === "mine" && currentUserId) {
      return members.filter((member) => member.userId === currentUserId);
    }

    return members;
  }, [members, viewMode, currentUserId]);

  const totalOverdue = useMemo(
    () => visibleMembers.reduce((sum, member) => sum + member.overdueCount, 0),
    [visibleMembers]
  );

  const totalActiveTasks = useMemo(
    () => visibleMembers.reduce((sum, member) => sum + member.activeTaskCount, 0),
    [visibleMembers]
  );

  const refreshBoard = async () => {
    if (!session) {
      return;
    }

    setIsLoadingBoard(true);
    setError(null);

    try {
      const response = await fetch("/api/team/visibility", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to refresh");
      }

      const payload = (await response.json()) as TeamVisibilityResponse;
      setCurrentUserId(payload.data.currentUserId);
      setMembers(payload.data.members);
    } catch {
      setError("Refresh failed. Try again.");
    } finally {
      setIsLoadingBoard(false);
    }
  };

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
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Team</h1>
              <p className="mt-2 text-muted-foreground">
                Everyone can see what everyone is working on without asking.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "all" ? "default" : "outline"}
                onClick={() => setViewMode("all")}
              >
                <ListFilter data-icon="inline-start" />
                All Team
              </Button>
              <Button
                variant={viewMode === "mine" ? "default" : "outline"}
                onClick={() => setViewMode("mine")}
              >
                <ListFilter data-icon="inline-start" />
                Only My Tasks
              </Button>
              <Button variant="ghost" onClick={refreshBoard} disabled={isLoadingBoard}>
                <RefreshCw data-icon="inline-start" />
                Refresh
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Shared Visibility</CardTitle>
              <CardDescription>
                {visibleMembers.length} teammates, {totalActiveTasks} active tasks, {totalOverdue} overdue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              {isLoadingBoard ? (
                <p className="text-sm text-muted-foreground">Loading team visibility...</p>
              ) : null}

              {!isLoadingBoard && visibleMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No teammates found for this view.</p>
              ) : null}

              <div className="flex flex-col gap-4">
                {visibleMembers.map((member) => {
                  const workload = workloadMeta(member.workload);

                  return (
                    <Card key={member.userId} size="sm">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <CardTitle>{member.name || member.email}</CardTitle>
                            <CardDescription>{member.email}</CardDescription>
                          </div>
                          <div className="flex flex-col items-end gap-1 text-sm">
                            <p className="text-muted-foreground">
                              {workload.icon} {workload.label} load ({member.activeTaskCount})
                            </p>
                            {member.overdueCount > 0 ? (
                              <p className="font-medium text-destructive">
                                ⚠ {member.overdueCount} overdue
                              </p>
                            ) : (
                              <p className="text-muted-foreground">No overdue tasks</p>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {member.tasks.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No active Todo/Doing tasks.</p>
                        ) : (
                          <ul className="flex flex-col gap-2">
                            {member.tasks.map((task) => {
                              const overdue = isOverdue(task.dueDate);

                              return (
                                <li
                                  key={task.id}
                                  className="rounded-lg border p-3 transition-colors hover:bg-muted/50"
                                >
                                  <Link
                                    href={`/tasks?taskId=${task.id}`}
                                    className="flex flex-col gap-1"
                                  >
                                    <span className="font-medium">{task.title}</span>
                                    <span className="text-sm text-muted-foreground">
                                      {statusLabel(task.status)}
                                    </span>
                                    {task.dueDate ? (
                                      <span
                                        className={`inline-flex items-center gap-1 text-xs ${
                                          overdue ? "text-destructive" : "text-muted-foreground"
                                        }`}
                                      >
                                        <Clock3 className="size-3" />
                                        {overdue
                                          ? "Overdue"
                                          : `Due ${new Date(task.dueDate).toLocaleDateString()}`}
                                      </span>
                                    ) : null}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </CardContent>
                      <CardFooter className="justify-between">
                        <p className="text-xs text-muted-foreground">{formatRelativeTime(member.lastActivityAt)}</p>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/tasks?assignee=${member.userId}`}>
                            View all
                            <ArrowRight data-icon="inline-end" />
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="size-3.5" />
                This view is for awareness. Open a task for full detail.
              </div>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <p className="text-xs text-muted-foreground">Top 5 active tasks shown per person</p>
            </CardFooter>
          </Card>
        </div>
      </main>
    </>
  );
}
