"use server";

import { prisma } from "@/lib/prisma";
import { ClientStatus, ProjectStatus } from "@/generated/prisma/client";

export async function getClients() {
  try {
    const clients = await prisma.client.findMany({
      include: {
        projects: {
          include: { owner: true }
        },
        _count: {
          select: { projects: true, tasks: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    return { success: true, data: clients };
  } catch (error) {
    console.error("Error fetching clients:", error);
    return { success: false, error: "Failed to fetch clients" };
  }
}

export async function getClientById(id: string) {
  try {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        projects: {
          include: {
            owner: true,
            tasks: {
              include: {
                assignedTo: true,
                createdBy: true
              }
            }
          }
        },
        tasks: {
          include: {
            assignedTo: true,
            createdBy: true,
            project: true
          }
        }
      }
    });

    if (!client) {
      return { success: false, error: "Client not found" };
    }

    return { success: true, data: client };
  } catch (error) {
    console.error("Error fetching client:", error);
    return { success: false, error: "Failed to fetch client" };
  }
}

export async function createClient(name: string, status: string = "ACTIVE") {
  try {
    if (!name || name.trim() === "") {
      return { success: false, error: "Client name is required" };
    }

    const client = await prisma.client.create({
      data: {
        name: name.trim(),
        status: status as any
      },
      include: {
        projects: true,
        _count: {
          select: { projects: true, tasks: true }
        }
      }
    });

    return { success: true, data: client };
  } catch (error) {
    console.error("Error creating client:", error);
    return { success: false, error: "Failed to create client" };
  }
}

export async function updateClient(
  id: string,
  updates: { name?: string; status?: ClientStatus }
) {
  try {
    const client = await prisma.client.update({
      where: { id },
      data: {
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.status !== undefined && { status: updates.status }),
      },
      include: {
        projects: true,
        _count: {
          select: { projects: true, tasks: true }
        }
      }
    });

    return { success: true, data: client };
  } catch (error) {
    console.error("Error updating client:", error);
    return { success: false, error: "Failed to update client" };
  }
}

export async function deleteClient(id: string) {
  try {
    await prisma.client.delete({
      where: { id }
    });

    return { success: true, message: "Client deleted successfully" };
  } catch (error) {
    console.error("Error deleting client:", error);
    return { success: false, error: "Failed to delete client" };
  }
}

export async function getClientProjects(clientId: string) {
  try {
    const projects = await prisma.project.findMany({
      where: { clientId },
      include: {
        owner: true,
        tasks: {
          include: {
            assignedTo: true,
            createdBy: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return { success: true, data: projects };
  } catch (error) {
    console.error("Error fetching projects:", error);
    return { success: false, error: "Failed to fetch projects" };
  }
}

export async function createProject(
  name: string,
  clientId: string,
  ownerId: string,
  dueDate?: Date,
  status: string = "ACTIVE"
) {
  try {
    if (!name || !clientId || !ownerId) {
      return { success: false, error: "Missing required fields" };
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        client: { connect: { id: clientId } },
        owner: { connect: { id: ownerId } },
        dueDate,
        status: status as any
      },
      include: {
        owner: true,
        client: true,
        tasks: true
      }
    });

    return { success: true, data: project };
  } catch (error) {
    console.error("Error creating project:", error);
    return { success: false, error: "Failed to create project" };
  }
}

export async function updateProject(
  id: string,
  updates: { name?: string; status?: ProjectStatus; dueDate?: Date }
) {
  try {
    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.status !== undefined && { status: updates.status }),
        ...(updates.dueDate !== undefined && { dueDate: updates.dueDate }),
      },
      include: {
        owner: true,
        client: true,
        tasks: true
      }
    });

    return { success: true, data: project };
  } catch (error) {
    console.error("Error updating project:", error);
    return { success: false, error: "Failed to update project" };
  }
}

export async function deleteProject(id: string) {
  try {
    await prisma.project.delete({
      where: { id }
    });

    return { success: true, message: "Project deleted successfully" };
  } catch (error) {
    console.error("Error deleting project:", error);
    return { success: false, error: "Failed to delete project" };
  }
}
