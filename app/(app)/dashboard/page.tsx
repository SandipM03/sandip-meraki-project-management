"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TaskCard } from "@/components/dashboard/task-card";
import { KanbanBoard } from "@/components/dashboard/kanban-board";
import { getDashboardData, updateTaskStatus } from "@/lib/dashboard-actions";
import { Plus, AlertCircle, CheckCircle2, Clock, Star } from "lucide-react";

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showMyTasksOnly, setShowMyTasksOnly] = useState(false);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/signin");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session) {
      loadDashboardData();
    }
  }, [session]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const result = await getDashboardData();
      if (result.success) {
        setDashboardData(result.data);
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId: string, status: "TODO" | "DOING" | "DONE") => {
    try {
      await updateTaskStatus(taskId, status);
      await loadDashboardData();
    } catch (error) {
      console.error("Failed to update task status:", error);
    }
  };

  if (isPending) {
    return <div className="flex items-center justify-center h-screen">Loading…</div>;
  }

  if (!session) {
    return null;
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </main>
      </>
    );
  }

  const todaysTasks = dashboardData?.todaysTasks || [];
  const overdueTasks = dashboardData?.overdueTasks || [];
  const activeProjects = dashboardData?.activeProjects || [];
  const tasksByStatus = dashboardData?.tasksByStatus || [];
  const stats = dashboardData?.stats || {};

  const displayedTasks = showMyTasksOnly
    ? dashboardData?.myTasks || []
    : [...overdueTasks, ...todaysTasks];

  const limitedProjects = activeProjects.slice(0, 4);
  const limitedTasks = displayedTasks.slice(0, 5);

  return (
    <>
      <Navbar />
      <main className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-gray-900/50">
        <div className="max-w-full mx-auto space-y-6">
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Welcome back, {session.user.name || session.user.email}
              </p>
            </div>
            <Button size="sm" className="gap-2 border border-2px" onClick={() => router.push("/tasks")}>
              <Plus className="w-4 h-4 " />
              Add Task
            </Button>
          </div>

          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-red-500 dark:text-red-400">Overdue</CardTitle>
                <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.overdue || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Due Today</CardTitle>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.tasksToday || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                <Star className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.inProgress || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">My Tasks</CardTitle>
                <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.myTasks || 0}</div>
              </CardContent>
            </Card>
          </div>

      
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 space-y-6">
              
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Today's Tasks</CardTitle>
                      {overdueTasks.length > 0 && (
                        <CardDescription className="text-red-500 dark:text-red-400 font-medium">
                          You have {overdueTasks.length} overdue task(s)
                        </CardDescription>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={showMyTasksOnly ? "default" : "outline"}
                      onClick={() => setShowMyTasksOnly(!showMyTasksOnly)}
                    >
                      {showMyTasksOnly ? "Show All" : "Show Mine Only"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {limitedTasks.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-muted-foreground">
                        {showMyTasksOnly ? "You have no tasks assigned." : "No tasks due today. Great job!"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {limitedTasks.map((task: any) => (
                        <TaskCard
                          key={task.id}
                          id={task.id}
                          title={task.title}
                          status={task.status}
                          dueDate={task.dueDate}
                          projectName={task.project?.name || "Unknown"}
                          assigneeName={task.assignedTo?.name}
                          isOverdue={overdueTasks.some((t: any) => t.id === task.id)}
                          onStatusChange={(status) => handleStatusChange(task.id, status)}
                        />
                      ))}
                      {displayedTasks.length > 5 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => router.push("/tasks")}
                          className="w-full mt-2"
                        >
                          View all {displayedTasks.length} tasks
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Progress Board</CardTitle>
                </CardHeader>
                <CardContent>
                  <KanbanBoard
                    tasks={tasksByStatus.map((t: any) => ({
                      id: t.id,
                      title: t.title,
                      status: t.status,
                      projectName: t.project?.name || "Unknown",
                      assignedTo: t.assignedTo,
                    }))}
                    onStatusChange={handleStatusChange}
                  />
                </CardContent>
              </Card>
            </div>

            
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Active Projects</CardTitle>
                </CardHeader>
                <CardContent>
                  {activeProjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No active projects</p>
                  ) : (
                    <div className="space-y-4">
                      {limitedProjects.map((project: any) => (
                        <div
                          key={project.id}
                          className="p-3 rounded-lg border hover:border-primary/50 transition-colors cursor-pointer"
                          onClick={() => router.push(`/projects`)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">{project.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {project.tasks.length} tasks
                              </p>
                            </div>
                            <span className="ml-2 px-2 py-1 text-xs rounded-full bg-primary/10 text-primary whitespace-nowrap">
                              {project.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {activeProjects.length > 4 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => router.push("/projects")}
                      className="w-full mt-4"
                    >
                      View all {activeProjects.length} projects
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Projects</span>
                    <span className="font-bold">{activeProjects.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Tasks</span>
                    <span className="font-bold">{tasksByStatus.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Completion</span>
                    <span className="font-bold">
                      {tasksByStatus.length > 0
                        ? Math.round(
                            ((tasksByStatus.filter((t: any) => t.status === "DONE").length) /
                              tasksByStatus.length) *
                              100
                          )
                        : 0}
                      %
                    </span>
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
