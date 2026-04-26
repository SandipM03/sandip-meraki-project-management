"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Edit, User, Calendar, Tag, Flag } from "lucide-react";

type TaskStatus = "TODO" | "DOING" | "DONE";

type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueDate: string | null;
  assignedToId: string | null;
  createdById: string;
  projectId: string;
  clientId: string;
  updatedAt: string;
  assignedTo: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  project: {
    id: string;
    name: string;
  };
  client: {
    id: string;
    name: string;
  };
};

type TeamUser = {
  id: string;
  name: string | null;
  email: string;
};

type TaskProject = {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
};

type TasksResponse = {
  data: {
    currentUserId: string;
    tasks: TaskItem[];
    users: TeamUser[];
    projects: TaskProject[];
  };
};

function statusLabel(status: TaskStatus): string {
  if (status === "DOING") {
    return "Doing";
  }

  if (status === "DONE") {
    return "Done";
  }

  return "Todo";
}

function displayUser(user: TeamUser): string {
  return user.name || user.email;
}

export default function TasksPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const assigneeFilter = useMemo(() => searchParams.get("assignee"), [searchParams]);
  const taskIdFilter = useMemo(() => searchParams.get("taskId"), [searchParams]);

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [projects, setProjects] = useState<TaskProject[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/signin");
    }
  }, [session, isPending, router]);

  const loadTasks = useCallback(async () => {
    const params = new URLSearchParams();
    if (assigneeFilter) {
      params.set("assignee", assigneeFilter);
    }
    if (taskIdFilter) {
      params.set("taskId", taskIdFilter);
    }

    const query = params.toString();
    const endpoint = query ? `/api/tasks?${query}` : "/api/tasks";

    try {
      setIsLoadingTasks(true);
      setError(null);

      const response = await fetch(endpoint, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (response.status === 401) {
        router.push("/signin");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to load tasks");
      }

      const payload = (await response.json()) as TasksResponse;

      setCurrentUserId(payload.data.currentUserId);
      setTasks(payload.data.tasks);
      setUsers(payload.data.users);
      setProjects(payload.data.projects);

      if (payload.data.projects.length > 0) {
        setProjectId((previous) => previous || payload.data.projects[0].id);
      }
    } catch {
      setError("Could not load tasks.");
    } finally {
      setIsLoadingTasks(false);
    }
  }, [assigneeFilter, taskIdFilter, router]);

  useEffect(() => {
    if (!session) {
      return;
    }

    queueMicrotask(() => {
      void loadTasks();
    });
  }, [session, loadTasks]);

  const createTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch("/api/tasks", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          projectId: projectId || null,
          clientId: projectId ? projects.find((project) => project.id === projectId)?.clientId : null,
          assignedToId: assignedToId || null,
          status,
          dueDate: dueDate || null,
        }),
      });

      if (response.status === 401) {
        router.push("/signin");
        return;
      }

      if (!response.ok) {
        const payload = (await response.json()) as {
          error?: { message?: string };
        };

        setError(payload.error?.message || "Could not create task.");
        return;
      }

      setTitle("");
      setDescription("");
      setAssignedToId("");
      setStatus("TODO");
      setDueDate("");
      setProjectId("");

      await loadTasks();
    } catch {
      setError("Could not create task.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const patchTask = async (
    taskId: string,
    payload: { status?: TaskStatus; assignedToId?: string | null }
  ) => {
    try {
      setUpdatingTaskId(taskId);
      setError(null);

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        router.push("/signin");
        return;
      }

      if (!response.ok) {
        const errorPayload = (await response.json()) as {
          error?: { message?: string };
        };
        setError(errorPayload.error?.message || "Could not update task.");
        return;
      }

      await loadTasks();
    } catch {
      setError("Could not update task.");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) {
      return;
    }

    try {
      setUpdatingTaskId(taskId);
      setError(null);

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.status === 401) {
        router.push("/signin");
        return;
      }

      if (!response.ok) {
        const errorPayload = (await response.json()) as {
          error?: { message?: string };
        };
        setError(errorPayload.error?.message || "Could not delete task.");
        return;
      }

      await loadTasks();
    } catch {
      setError("Could not delete task.");
    } finally {
      setUpdatingTaskId(null);
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
      <main className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-gray-900/50">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Tasks</h1>
              <p className="mt-1 text-muted-foreground">
                Create, update, and assign tasks to yourself or teammates.
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Create Task</CardTitle>
              <CardDescription>Add a new task to your project.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createTask} className="flex flex-col gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    placeholder="Task title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    required
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-muted-foreground">Project</label>
                    <select
                      value={projectId}
                      onChange={(event) => setProjectId(event.target.value)}
                      className="h-10 rounded-md border border-input dark:bg-gray-800 px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="">No Project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id} >
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-muted-foreground">Assignee</label>
                    <select
                      value={assignedToId}
                      onChange={(event) => setAssignedToId(event.target.value)}
                      className="h-10 rounded-md border border-input dark:bg-gray-800 px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="">Unassigned</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {displayUser(user)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <select
                      value={status}
                      onChange={(event) => setStatus(event.target.value as TaskStatus)}
                      className="h-10 rounded-md border border-input dark:bg-gray-800 px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="TODO">Todo</option>
                      <option value="DOING">Doing</option>
                      <option value="DONE">Done</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-muted-foreground">Due Date</label>
                    <Input
                      type="date"
                      value={dueDate}
                      className="dark:bg-gray-800 h-10"
                      onChange={(event) => setDueDate(event.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="gap-2 border border-2px"
                  >
                    <Plus className="size-4" />
                    {isSubmitting ? "Creating..." : "Create Task"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Task List</CardTitle>
              <CardDescription>
                {isLoadingTasks ? "Loading..." : `${tasks.length} tasks`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error ? (
                <p className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                  {error}
                </p>
              ) : null}

              {!isLoadingTasks && tasks.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">No tasks found. Create one to get started!</p>
                </div>
              ) : null}

              <ul className="flex flex-col gap-4">
                {tasks.map((task) => {
                  const isUpdating = updatingTaskId === task.id;
                  const isMine = currentUserId !== null && task.assignedToId === currentUserId;

                  return (
                    <li key={task.id} className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-card text-card-foreground shadow-sm transition-all">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{task.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground mt-3">
                          <span className="flex items-center gap-1.5"><Tag className="size-3" />{task.project?.name || 'No Project'}</span>
                          <span className="flex items-center gap-1.5"><User className="size-3" />{task.assignedTo ? displayUser(task.assignedTo) : 'Unassigned'}</span>
                          <span className="flex items-center gap-1.5"><Calendar className="size-3" />{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</span>
                          <span className="flex items-center gap-1.5"><Flag className="size-3" />{statusLabel(task.status)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <select
                          value={task.status}
                          onChange={(e) => patchTask(task.id, { status: e.target.value as TaskStatus })}
                          disabled={isUpdating}
                          className="h-9 rounded-md border border-input dark:bg-gray-800 px-2 text-sm"
                        >
                          <option value="TODO">Todo</option>
                          <option value="DOING">Doing</option>
                          <option value="DONE">Done</option>
                        </select>
                        <select
                          value={task.assignedToId || ""}
                          onChange={(e) => patchTask(task.id, { assignedToId: e.target.value || null })}
                          disabled={isUpdating}
                          className="h-9 rounded-md border border-input dark:bg-gray-800 px-2 text-sm"
                        >
                          <option value="">Unassigned</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {displayUser(user)}
                            </option>
                          ))}
                        </select>
                        
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => deleteTask(task.id)}
                          disabled={isUpdating}
                          aria-label="Delete task"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
