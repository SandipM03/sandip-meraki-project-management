"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Plus, UserRound } from "lucide-react";

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
      router.push("/login");
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
        router.push("/login");
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

    if (!projectId) {
      setError("Select a project first.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const selectedProject = projects.find((project) => project.id === projectId);
      if (!selectedProject) {
        setError("Project not found.");
        return;
      }

      const response = await fetch("/api/tasks", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          projectId: selectedProject.id,
          clientId: selectedProject.clientId,
          assignedToId: assignedToId || null,
          status,
          dueDate: dueDate || null,
        }),
      });

      if (response.status === 401) {
        router.push("/login");
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
        router.push("/login");
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
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold">Tasks</h1>
              <p className="mt-2 text-muted-foreground">
                Create tasks, update status, and assign to yourself or teammates.
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Create Task</CardTitle>
              <CardDescription>Add a task and assign ownership immediately.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createTask} className="flex flex-col gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    placeholder="Task title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-muted-foreground">Project</span>
                    <select
                      value={projectId}
                      onChange={(event) => setProjectId(event.target.value)}
                      className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      {projects.length === 0 ? (
                        <option value="">No projects</option>
                      ) : null}
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name} ({project.clientName})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-muted-foreground">Assignee</span>
                    <select
                      value={assignedToId}
                      onChange={(event) => setAssignedToId(event.target.value)}
                      className="h-8 rounded-lg border border-input bg-white text-gray-600 px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <option value="">Unassigned</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {displayUser(user)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <select
                      value={status}
                      onChange={(event) => setStatus(event.target.value as TaskStatus)}
                      className="h-8 rounded-lg border border-input bg-white text-gray-600 px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <option value="TODO">Todo</option>
                      <option value="DOING">Doing</option>
                      <option value="DONE">Done</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-muted-foreground">Due Date</span>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                    />
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting || projects.length === 0}
                  >
                    <Plus data-icon="inline-start" />
                    {isSubmitting ? "Creating..." : "Create Task"}
                  </Button>
                  {projects.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Create a project first before adding tasks.
                    </p>
                  ) : null}
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
                <p className="text-sm text-muted-foreground">No tasks found.</p>
              ) : null}

              <ul className="flex flex-col gap-3">
                {tasks.map((task) => {
                  const isUpdating = updatingTaskId === task.id;
                  const isMine = currentUserId !== null && task.assignedToId === currentUserId;

                  return (
                    <li key={task.id} className="rounded-lg border p-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-col gap-1">
                          <p className="font-medium">{task.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {task.project.name} • {task.client.name}
                          </p>
                          {task.description ? (
                            <p className="text-sm text-muted-foreground">{task.description}</p>
                          ) : null}
                          <p className="text-xs text-muted-foreground">
                            Assigned to: {task.assignedTo ? displayUser(task.assignedTo) : "Unassigned"}
                          </p>
                        </div>

                        <div className="grid gap-2 md:grid-cols-3 md:items-center">
                          <select
                            value={task.status}
                            disabled={isUpdating}
                            onChange={(event) =>
                              patchTask(task.id, {
                                status: event.target.value as TaskStatus,
                              })
                            }
                            className="h-8 min-w-[120px] rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                          >
                            <option value="TODO">{statusLabel("TODO")}</option>
                            <option value="DOING">{statusLabel("DOING")}</option>
                            <option value="DONE">{statusLabel("DONE")}</option>
                          </select>

                          <select
                            value={task.assignedToId || ""}
                            disabled={isUpdating}
                            onChange={(event) =>
                              patchTask(task.id, {
                                assignedToId: event.target.value || null,
                              })
                            }
                            className="h-8 min-w-[180px] rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                          >
                            <option value="">Unassigned</option>
                            {users.map((user) => (
                              <option key={user.id} value={user.id}>
                                {displayUser(user)}
                              </option>
                            ))}
                          </select>

                          <Button
                            variant="outline"
                            disabled={isUpdating || isMine || !currentUserId}
                            onClick={() => patchTask(task.id, { assignedToId: currentUserId })}
                          >
                            {isMine ? (
                              <Check data-icon="inline-start" />
                            ) : (
                              <UserRound data-icon="inline-start" />
                            )}
                            {isMine ? "Assigned to me" : "Assign to me"}
                          </Button>
                        </div>
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
