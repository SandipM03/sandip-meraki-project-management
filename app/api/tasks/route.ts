import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma, TaskStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

function parseStatus(value: unknown): TaskStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  if (!Object.values(TaskStatus).includes(value as TaskStatus)) {
    return null;
  }

  return value as TaskStatus;
}

export async function GET(request: NextRequest) {
  const currentUserId = await getCurrentUserId(request);

  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = parseStatus(request.nextUrl.searchParams.get("status"));
  const assignee = request.nextUrl.searchParams.get("assignee");
  const taskId = request.nextUrl.searchParams.get("taskId");

  const where: Prisma.TaskWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (assignee) {
    where.assignedToId = assignee;
  }

  if (taskId) {
    where.id = taskId;
  }

  const [tasks, users, projects] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        dueDate: true,
        assignedToId: true,
        createdById: true,
        projectId: true,
        clientId: true,
        updatedAt: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
      },
    }),
    prisma.project.findMany({
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        clientId: true,
        client: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  return NextResponse.json(
    {
      data: {
        currentUserId,
        tasks: tasks.map((task) => ({
          ...task,
          dueDate: task.dueDate ? task.dueDate.toISOString() : null,
          updatedAt: task.updatedAt.toISOString(),
        })),
        users,
        projects: projects.map((project) => ({
          id: project.id,
          name: project.name,
          clientId: project.clientId,
          clientName: project.client.name,
        })),
      },
    },
    { status: 200 }
  );
}

export async function POST(request: NextRequest) {
  const currentUserId = await getCurrentUserId(request);

  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const dueDateValue = typeof body.dueDate === "string" ? body.dueDate : "";
  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  const clientIdValue =
    typeof body.clientId === "string" ? body.clientId : undefined;
  const assignedToIdValue =
    typeof body.assignedToId === "string" ? body.assignedToId : "";
  const status = parseStatus(body.status) ?? TaskStatus.TODO;

  if (!title) {
    return NextResponse.json(
      { error: { message: "Title is required" } },
      { status: 400 }
    );
  }

  let clientId = clientIdValue ?? undefined;

  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, clientId: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: { message: "Project not found" } },
        { status: 404 }
      );
    }

    clientId = clientIdValue ?? project.clientId;

    if (clientId !== project.clientId) {
      return NextResponse.json(
        { error: { message: "Project and client do not match" } },
        { status: 400 }
      );
    }
  }

  if (assignedToIdValue) {
    const assignee = await prisma.user.findUnique({
      where: { id: assignedToIdValue },
      select: { id: true },
    });

    if (!assignee) {
      return NextResponse.json(
        { error: { message: "Assignee not found" } },
        { status: 404 }
      );
    }
  }

  const dueDate = dueDateValue ? new Date(dueDateValue) : null;
  if (dueDateValue && Number.isNaN(dueDate?.getTime())) {
    return NextResponse.json(
      { error: { message: "Invalid due date" } },
      { status: 400 }
    );
  }

  const task = await prisma.task.create({
    data: {
      title,
      description: description || null,
      status,
      dueDate,
      assignedToId: assignedToIdValue || null,
      createdById: currentUserId,
      projectId: projectId || null,
      clientId: clientId || null,
    },
    select: {
      id: true,
      title: true,
      status: true,
      assignedToId: true,
      dueDate: true,
      projectId: true,
      clientId: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(
    {
      data: {
        task: {
          ...task,
          dueDate: task.dueDate ? task.dueDate.toISOString() : null,
          updatedAt: task.updatedAt.toISOString(),
        },
      },
    },
    { status: 201 }
  );
}
