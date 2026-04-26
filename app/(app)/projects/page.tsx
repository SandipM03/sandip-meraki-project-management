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
      router.push("/signin");
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
      fetch("/api/tasks", { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          const users = data?.data?.users || (Array.isArray(data?.users) ? data.users : []);
          setUsers(users);
        });
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Projects</h1>
              <p className="text-muted-foreground mt-1">View and manage all your projects.</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Card className="lg:col-span-1 xl:col-span-1">
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
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Client <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={newProject.clientId}
                      onValueChange={(value) =>
                        setNewProject({ ...newProject, clientId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Client" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-800">
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Input
                    type="date"
                    value={newProject.dueDate}
                    onChange={(e) =>
                      setNewProject({ ...newProject, dueDate: e.target.value })
                    }
                  />
                  <Button type="submit" className="w-full">
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
                <Card key={project.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle>{project.name}</CardTitle>
                    <CardDescription>
                      {project.client?.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground">Owner: {project.owner?.name || 'Unassigned'}</p>
                    <p className="text-sm text-muted-foreground">Due: {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'N/A'}</p>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between gap-2">
                    <span className="rounded-md border px-2.5 py-0.5 text-sm font-medium">
                      {project.status}
                    </span>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteProject(project.id)}
                      disabled={deletingProjectId === project.id}
                      aria-label={`Delete project ${project.name}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <Card className="md:col-span-2 lg:col-span-3 xl:col-span-3">
                <CardContent className="flex flex-col items-center justify-center text-center h-full p-6">
                  <h3 className="text-lg font-semibold">No Projects Yet</h3>
                  <p className="text-muted-foreground mt-2">
                    Create your first project to get started.
                  </p>
                </CardContent>
              </Card>
            )}
            {deleteError ? (
              <p className="text-sm text-red-600 md:col-span-2 lg:col-span-3 xl:col-span-4">{deleteError}</p>
            ) : null}
          </div>
        </div>
      </main>
    </>
  );
}
