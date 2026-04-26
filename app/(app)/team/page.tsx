"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, AlertTriangle, Calendar, CheckCircle } from "lucide-react";
import Link from "next/link";

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
    return { icon: "🟢", label: "Light", color: "text-green-600 dark:text-green-400" };
  }

  if (workload === "medium") {
    return { icon: "🟡", label: "Medium", color: "text-yellow-500" };
  }

  return { icon: "🔴", label: "Heavy", color: "text-red-500" };
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
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 1) {
    return "just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
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
      router.push("/signin");
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
          router.push("/signin");
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

  const teamStats = useMemo(() => {
    return {
      totalOverdue: visibleMembers.reduce((sum, member) => sum + member.overdueCount, 0),
      totalActiveTasks: visibleMembers.reduce((sum, member) => sum + member.activeTaskCount, 0),
      totalMembers: visibleMembers.length,
      lightLoad: visibleMembers.filter((m) => m.workload === "light").length,
      mediumLoad: visibleMembers.filter((m) => m.workload === "medium").length,
      heavyLoad: visibleMembers.filter((m) => m.workload === "heavy").length,
    };
  }, [visibleMembers]);

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
        router.push("/signin");
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
    return <div className="flex items-center justify-center h-screen">Loading…</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Team</h1>
              <p className="text-muted-foreground mt-1">
                An overview of your team's workload and activity.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "all" ? "default" : "outline"}
                onClick={() => setViewMode("all")}
                aria-label="View all team members"
              >
                All Team
              </Button>
              <Button
                variant={viewMode === "mine" ? "default" : "outline"}
                onClick={() => setViewMode("mine")}
                aria-label="View only your tasks"
              >
                My Tasks
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={refreshBoard}
                disabled={isLoadingBoard}
                aria-label="Refresh team data"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingBoard ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Main Grid: Left (Members) | Right (Stats) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Team Members */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>
                    {teamStats.totalMembers} teammates, {teamStats.totalActiveTasks} active tasks, {teamStats.totalOverdue} overdue
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {error ? (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                      {error}
                    </div>
                  ) : null}

                  {isLoadingBoard ? (
                    <p className="text-sm text-muted-foreground text-center py-10">Loading team visibility…</p>
                  ) : null}

                  {!isLoadingBoard && visibleMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-10">No teammates found for this view.</p>
                  ) : null}

                  <div className="space-y-4">
                    {visibleMembers.map((member) => {
                      const workload = workloadMeta(member.workload);

                      return (
                        <div
                          key={member.userId}
                          className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
                        >
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{member.name || member.email}</p>
                              <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                            </div>
                            <div className="flex items-center gap-2 text-sm whitespace-nowrap">
                              <span className={workload.color}>{workload.icon}</span>
                              <span>{workload.label}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mb-3 text-sm text-muted-foreground">
                            <span>
                              {member.activeTaskCount} active task{member.activeTaskCount !== 1 ? 's' : ''}
                            </span>
                            {member.overdueCount > 0 ? (
                              <span className="flex items-center gap-1 text-red-500"><AlertTriangle className="size-4" /> {member.overdueCount} overdue</span>
                            ) : (
                              <span className="flex items-center gap-1 text-green-500"><CheckCircle className="size-4" /> No overdue tasks</span>
                            )}
                          </div>

                          {member.tasks.length > 0 ? (
                            <ul className="space-y-2 mb-3">
                              {member.tasks.slice(0, 3).map((task) => {
                                const overdue = isOverdue(task.dueDate);

                                return (
                                  <li key={task.id} className="flex items-center justify-between text-sm p-2 rounded-md bg-gray-100 dark:bg-gray-800/50">
                                    <span className="truncate flex-1 pr-4">{task.title}</span>
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                      <span className={`font-medium ${overdue ? 'text-red-500' : ''}`}>
                                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                                      </span>
                                      <span className="w-16 text-center">{statusLabel(task.status)}</span>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground mb-3 text-center py-4">No active tasks</p>
                          )}

                          <div className="flex items-center justify-between pt-3 border-t">
                            <p className="text-sm text-muted-foreground">
                              Last activity: {formatRelativeTime(member.lastActivityAt)}
                            </p>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/tasks?assignee=${member.userId}`}>
                                View All Tasks
                              </Link>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Team Stats */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Team Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Members</span>
                    <span className="font-bold text-lg">{teamStats.totalMembers}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Active Tasks</span>
                    <span className="font-bold text-lg">{teamStats.totalActiveTasks}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Overdue</span>
                    <span
                      className={`font-bold text-lg ${
                        teamStats.totalOverdue > 0 ? "text-red-500" : ""
                      }`}
                    >
                      {teamStats.totalOverdue}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Workload Distribution</CardTitle>
                  <CardDescription>Team member load status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="text-green-500">🟢</span> Light Load
                    </span>
                    <span className="font-semibold">{teamStats.lightLoad}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="text-yellow-500">🟡</span> Medium Load
                    </span>
                    <span className="font-semibold">{teamStats.mediumLoad}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="text-red-500">🔴</span> Heavy Load
                    </span>
                    <span className="font-semibold">{teamStats.heavyLoad}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
