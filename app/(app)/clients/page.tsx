"use client";

import * as React from "react";
import type { DragEndEvent, UniqueIdentifier } from "@dnd-kit/core";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Navbar } from "@/components/navbar";
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnHandle,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
} from "@/components/ui/kanban";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createClient,
  deleteClient,
  getClients,
  updateClient,
  createProject,
} from "@/lib/clients-actions";
import {
  Plus,
  Trash2,
  FolderPlus,
  Users,
  AlertCircle,
  GripVertical,
} from "lucide-react";

type ClientWithData = {
  id: string;
  name: string;
  status: "ACTIVE" | "AT_RISK" | "COMPLETED";
  projects: any[];
  _count?: { projects: number; tasks: number };
  createdAt: Date;
  updatedAt: Date;
};

const CLIENT_STATUSES = ["ACTIVE", "AT_RISK", "COMPLETED"] as const;

function isClientStatus(value: UniqueIdentifier): value is (typeof CLIENT_STATUSES)[number] {
  return CLIENT_STATUSES.includes(value as (typeof CLIENT_STATUSES)[number]);
}

export default function ClientsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const [columns, setColumns] = React.useState<Record<string, ClientWithData[]>>({
    ACTIVE: [],
    AT_RISK: [],
    COMPLETED: [],
  });

  const [loading, setLoading] = React.useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = React.useState(false);
  const [newClientName, setNewClientName] = React.useState("");
  const [selectedClient, setSelectedClient] = React.useState<ClientWithData | null>(null);
  const [newProjectName, setNewProjectName] = React.useState("");
  const [newProjectOwner, setNewProjectOwner] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/signin");
    }
  }, [session, isPending, router]);

  const loadClients = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getClients();
    if (result.success) {
      const clientsByStatus = {
        ACTIVE: result.data.filter((c: ClientWithData) => c.status === "ACTIVE"),
        AT_RISK: result.data.filter((c: ClientWithData) => c.status === "AT_RISK"),
        COMPLETED: result.data.filter((c: ClientWithData) => c.status === "COMPLETED"),
      };
      setColumns(clientsByStatus);
    } else {
      setError(result.error || "Failed to load clients");
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    setCreating(true);
    setError(null);
    const result = await createClient(newClientName.trim(), "ACTIVE");

    if (result.success) {
      setNewClientName("");
      setIsCreateDialogOpen(false);
      await loadClients();
    } else {
      setError(result.error || "Failed to create client");
    }

    setCreating(false);
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm("Are you sure you want to delete this client?")) return;

    const result = await deleteClient(clientId);
    if (result.success) {
      await loadClients();
    } else {
      setError(result.error || "Failed to delete client");
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !selectedClient || !newProjectOwner.trim()) return;

    setCreating(true);
    setError(null);
    const result = await createProject(
      newProjectName.trim(),
      selectedClient.id,
      newProjectOwner.trim()
    );

    if (result.success) {
      setNewProjectName("");
      setNewProjectOwner("");
      setIsProjectDialogOpen(false);
      await loadClients();
    } else {
      setError(result.error || "Failed to create project");
    }

    setCreating(false);
  };

  const handleKanbanDragEnd = React.useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const movedClient = Object.values(columns)
        .flat()
        .find((client) => client.id === String(active.id));
      if (!movedClient) return;

      let targetStatus: ClientWithData["status"] | null = null;

      if (isClientStatus(over.id)) {
        targetStatus = over.id;
      } else {
        for (const status of CLIENT_STATUSES) {
          if (columns[status].some((client) => client.id === String(over.id))) {
            targetStatus = status;
            break;
          }
        }
      }

      if (!targetStatus || movedClient.status === targetStatus) return;

      setColumns((prev) => ({
        ACTIVE: prev.ACTIVE.map((client) =>
          client.id === movedClient.id ? { ...client, status: targetStatus } : client,
        ),
        AT_RISK: prev.AT_RISK.map((client) =>
          client.id === movedClient.id ? { ...client, status: targetStatus } : client,
        ),
        COMPLETED: prev.COMPLETED.map((client) =>
          client.id === movedClient.id ? { ...client, status: targetStatus } : client,
        ),
      }));

      const result = await updateClient(movedClient.id, { status: targetStatus });
      if (!result.success) {
        setError(result.error || "Failed to update client status");
        await loadClients();
      }
    },
    [columns, loadClients],
  );

  if (isPending) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!session) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading clients...</div>
      </div>
    );
  }

  const totalClients = Object.values(columns).flat().length;

  return (
    <>
      <Navbar />
      <main className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-gray-900/50">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Clients</h1>
            <p className="text-muted-foreground mt-2">
              Manage your clients, link projects, and track progress
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Clients Overview</h2>
                <p className="text-muted-foreground text-sm">
                  {totalClients} total clients across all statuses
                </p>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="size-4" />
                    Add Client
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Client</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateClient} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Client Name</label>
                      <Input
                        placeholder="Enter client name"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        disabled={creating}
                        autoFocus
                      />
                    </div>
                    {error && (
                      <div className="text-xs bg-red-50 text-red-700 p-2 rounded flex gap-2">
                        <AlertCircle className="size-4 flex-shrink-0 mt-0.5" />
                        {error}
                      </div>
                    )}
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                        disabled={creating}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={creating || !newClientName.trim()}>
                        {creating ? "Creating..." : "Create"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {error && !isCreateDialogOpen && !isProjectDialogOpen && (
              <div className="text-sm bg-red-50 text-red-700 p-3 rounded border border-red-200 flex gap-2">
                <AlertCircle className="size-4 flex-shrink-0 mt-0.5" />
                {error}
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-700 hover:text-red-900"
                >
                  ✕
                </button>
              </div>
            )}

            <Kanban
              value={columns}
              onValueChange={setColumns}
              onDragEnd={handleKanbanDragEnd}
              getItemValue={(item: ClientWithData) => item.id}
            >
              <KanbanBoard>
                {Object.entries(columns).map(([status, clients]) => (
                  <KanbanColumn key={status} value={status}>
                    <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border min-h-96">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                          <KanbanColumnHandle className="text-muted-foreground hover:text-foreground transition-colors">
                            <GripVertical className="size-4" />
                          </KanbanColumnHandle>
                          {status === "ACTIVE" && (
                            <>
                              <span className="size-2 rounded-full bg-green-500" />
                              Active
                            </>
                          )}
                          {status === "AT_RISK" && (
                            <>
                              <span className="size-2 rounded-full bg-yellow-500" />
                              At Risk
                            </>
                          )}
                          {status === "COMPLETED" && (
                            <>
                              <span className="size-2 rounded-full bg-green-600" />
                              Completed
                            </>
                          )}
                        </h3>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {clients.length}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {clients.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground text-sm">
                            No clients in this status
                          </div>
                        ) : (
                          clients.map((client) => (
                            <KanbanItem key={client.id} value={client.id}>
                              <ClientCard
                                client={client}
                                onDelete={handleDeleteClient}
                                onSelectProject={(c) => {
                                  setSelectedClient(c);
                                  setIsProjectDialogOpen(true);
                                }}
                              />
                            </KanbanItem>
                          ))
                        )}
                      </div>
                    </div>
                  </KanbanColumn>
                ))}
              </KanbanBoard>
              <KanbanOverlay />
            </Kanban>
          </div>

        
          <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Link Project to {selectedClient?.name}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Project Name</label>
                  <Input
                    placeholder="Enter project name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    disabled={creating}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Project Owner (User ID)</label>
                  <Input
                    placeholder="Enter owner user ID"
                    value={newProjectOwner}
                    onChange={(e) => setNewProjectOwner(e.target.value)}
                    disabled={creating}
                  />
                </div>
                {error && (
                  <div className="text-xs bg-red-50 text-red-700 p-2 rounded flex gap-2">
                    <AlertCircle className="size-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsProjectDialogOpen(false)}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={creating || !newProjectName.trim() || !newProjectOwner.trim()}
                  >
                    {creating ? "Creating..." : "Create Project"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </>
  );
}

interface ClientCardProps {
  client: ClientWithData;
  onDelete: (id: string) => void;
  onSelectProject: (client: ClientWithData) => void;
}

function ClientCard({ client, onDelete, onSelectProject }: ClientCardProps) {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-sm line-clamp-2">{client.name}</h4>
              <p className="text-xs text-muted-foreground">
                Created {new Date(client.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <KanbanItemHandle className="text-muted-foreground hover:text-foreground transition-colors">
                <GripVertical className="size-4" />
              </KanbanItemHandle>
              <button
                onClick={() => onDelete(client.id)}
                className="text-muted-foreground hover:text-red-500 transition-colors"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <FolderPlus className="size-3" />
              {client.projects?.length || 0} project{client.projects?.length !== 1 ? "s" : ""}
            </div>
            <div className="flex items-center gap-1">
              <Users className="size-3" />
              {client._count?.tasks || 0} task{client._count?.tasks !== 1 ? "s" : ""}
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onSelectProject(client)}
            className="w-full gap-2 text-xs"
          >
            <Plus className="size-3" />
            Link Project
          </Button>

          {client.projects && client.projects.length > 0 && (
            <div className="pt-2 border-t">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                {showDetails ? "Hide projects" : `View ${client.projects.length} project${client.projects.length !== 1 ? "s" : ""}`}
              </button>
              {showDetails && (
                <div className="mt-2 space-y-1">
                  {client.projects.map((project: any) => (
                    <div key={project.id} className="text-xs p-1 bg-muted/50 rounded">
                      {project.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
