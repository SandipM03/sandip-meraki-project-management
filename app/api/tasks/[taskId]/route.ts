import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TaskStatus } from "@prisma/client";
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

async function getCurrentUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true },
  });

  return user?.id ?? null;
}

type PatchContext = {
  params: Promise<{
    taskId: string;
  }>;
};

export async function PATCH(request: NextRequest, context: PatchContext) {
  const currentUserId = await getCurrentUserId(request);

  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await context.params;
  if (!taskId) {
    return NextResponse.json({ error: "Task id is required" }, { status: 400 });
  }

  const body = await request.json();

  let status: TaskStatus | undefined;
  if (body.status !== undefined) {
    const parsedStatus = parseStatus(body.status);

    if (!parsedStatus) {
      return NextResponse.json(
        { error: { message: "Invalid status" } },
        { status: 400 }
      );
    }

    status = parsedStatus;
  }

  const assignedToId =
    body.assignedToId === null
      ? null
      : typeof body.assignedToId === "string"
        ? body.assignedToId
        : undefined;

  if (status === undefined && assignedToId === undefined) {
    return NextResponse.json(
      { error: { message: "No updates provided" } },
      { status: 400 }
    );
  }

  if (typeof assignedToId === "string" && assignedToId.length > 0) {
    const assignee = await prisma.user.findUnique({
      where: { id: assignedToId },
      select: { id: true },
    });

    if (!assignee) {
      return NextResponse.json(
        { error: { message: "Assignee not found" } },
        { status: 404 }
      );
    }
  }

  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(status !== undefined ? { status } : {}),
      ...(assignedToId !== undefined
        ? { assignedToId: assignedToId === "" ? null : assignedToId }
        : {}),
    },
    select: {
      id: true,
      status: true,
      assignedToId: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(
    {
      data: {
        task: {
          ...updated,
          updatedAt: updated.updatedAt.toISOString(),
        },
      },
    },
    { status: 200 }
  );
}

export async function DELETE(request: NextRequest, context: PatchContext) {
  const currentUserId = await getCurrentUserId(request);

  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await context.params;
  if (!taskId) {
    return NextResponse.json({ error: "Task id is required" }, { status: 400 });
  }

  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await prisma.task.delete({
    where: { id: taskId },
  });

  return NextResponse.json(
    { data: { message: "Task deleted successfully" } },
    { status: 200 }
  );
}
