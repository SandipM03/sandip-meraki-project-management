"use client";

import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Plus, Trash2 } from "lucide-react";

type ClientOption = {
  id: string;
  name: string;
};

type UserOption = {
  id: string;
  name: string | null;
  email?: string;
};

type ProjectItem = {
  id: string;
  name: string;
  dueDate: string | null;
  status: string;
  client: {
    name: string;
  } | null;
  owner: {
    name: string | null;
  } | null;
};

export default function ProjectsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [newProject, setNewProject] = useState({
    name: "",
    clientId: "",
    ownerId: "",
    dueDate: "",
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session) {
      fetch("/api/projects", { credentials: "include" })
        .then((res) => res.json())
        .then((data) => setProjects(Array.isArray(data) ? data : []));
      fetch("/api/clients", { credentials: "include" })
        .then((res) => res.json())
        .then((data) => setClients(Array.isArray(data) ? data : []));
      // A real app would have a /api/users endpoint
      fetch("/api/tasks", { credentials: "include" })
        .then((res) => res.json())
        .then((data) => setUsers(Array.isArray(data?.users) ? data.users : []));
    }
  }, [session]);

  const handleCreateProject = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateError(null);

    if (!newProject.clientId) {
      setCreateError("Please select a client.");
      return;
    }

    const res = await fetch("/api/projects", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProject),
    });
    if (res.ok) {
      await res.json();
      // refetch projects to get the full object with relations
      fetch("/api/projects", { credentials: "include" })
        .then((res) => res.json())
        .then((data) => setProjects(Array.isArray(data) ? data : []));
      setNewProject({ name: "", clientId: "", ownerId: "", dueDate: "" });
      return;
    }

    const errorBody = await res.json().catch(() => null);
    const message =
      (errorBody as { error?: string } | null)?.error || "Failed to create project";
    setCreateError(message);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm("Delete this project? This will also delete related tasks.")) {
      return;
    }

    setDeleteError(null);
    setDeletingProjectId(projectId);

    const res = await fetch(`/api/projects/${projectId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (res.ok) {
      setProjects((prev) => prev.filter((project) => project.id !== projectId));
      setDeletingProjectId(null);
      return;
    }

    const errorBody = await res.json().catch(() => null);
    const message =
      (errorBody as { error?: string } | null)?.error || "Failed to delete project";
    setDeleteError(message);
    setDeletingProjectId(null);
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
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Projects</h1>
              <p className="text-muted-foreground mt-2">View and manage all your projects</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Create Project</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateProject} className="space-y-4">
                  <Input
                    placeholder="Project Name"
                    value={newProject.name}
                    onChange={(e) =>
                      setNewProject({ ...newProject, name: e.target.value })
                    }
                    required
                  />
                  <Select
                    onValueChange={(value) =>
                      setNewProject({ ...newProject, clientId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    onValueChange={(value) =>
                      setNewProject({ ...newProject, ownerId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Owner (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name ?? user.email ?? "Unnamed user"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={newProject.dueDate}
                    onChange={(e) =>
                      setNewProject({ ...newProject, dueDate: e.target.value })
                    }
                  />
                  <Button type="submit">
                    <Plus className="size-4 mr-2" />
                    Create Project
                  </Button>
                  {createError ? (
                    <p className="text-sm text-red-600">{createError}</p>
                  ) : null}
                </form>
              </CardContent>
            </Card>

            {projects.length > 0 ? (
              projects.map((project) => (
                <Card key={project.id}>
                  <CardHeader>
                    <CardTitle>{project.name}</CardTitle>
                    <CardDescription>
                      {project.client?.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Owner: {project.owner?.name}</p>
                    <p className="text-sm text-muted-foreground">Due Date: {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'N/A'}</p>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between gap-2">
                    <span className="rounded border px-2 py-0.5 text-xs font-medium">
                      {project.status}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteProject(project.id)}
                      disabled={deletingProjectId === project.id}
                    >
                      <Trash2 className="size-4 mr-2" />
                      {deletingProjectId === project.id ? "Deleting..." : "Delete"}
                    </Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <Card className="md:col-span-2 lg:col-span-3">
                <CardHeader>
                  <CardTitle>No Projects Yet</CardTitle>
                  <CardDescription>Create your first project to get started</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Projects help you organize your work. Create a project to start tracking tasks and collaborating with your team.
                  </p>
                </CardContent>
              </Card>
            )}
            {deleteError ? (
              <p className="text-sm text-red-600 md:col-span-2 lg:col-span-3">{deleteError}</p>
            ) : null}
          </div>
        </div>
      </main>
    </>
  );
}
