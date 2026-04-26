import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TaskStatus } from "@/generated/prisma/client";
import { NextRequest, NextResponse } from "next/server";

type TeamTask = {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate: string | null;
  updatedAt: string;
};

type TeamMemberVisibility = {
  userId: string;
  name: string | null;
  email: string;
  activeTaskCount: number;
  overdueCount: number;
  workload: "light" | "medium" | "heavy";
  lastActivityAt: string | null;
  tasks: TeamTask[];
};

function getWorkload(activeTaskCount: number): TeamMemberVisibility["workload"] {
  if (activeTaskCount <= 2) {
    return "light";
  }

  if (activeTaskCount <= 5) {
    return "medium";
  }

  return "heavy";
}

function compareTasksByUrgency(a: TeamTask, b: TeamTask, now: Date): number {
  const aOverdue = a.dueDate !== null && new Date(a.dueDate) < now;
  const bOverdue = b.dueDate !== null && new Date(b.dueDate) < now;

  if (aOverdue !== bOverdue) {
    return aOverdue ? -1 : 1;
  }

  if (a.status !== b.status) {
    return a.status === TaskStatus.DOING ? -1 : 1;
  }

  if (a.dueDate && b.dueDate) {
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  }

  if (a.dueDate && !b.dueDate) {
    return -1;
  }

  if (!a.dueDate && b.dueDate) {
    return 1;
  }

  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true },
  });

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const users = await prisma.user.findMany({
    orderBy: [
      { name: "asc" },
      { email: "asc" },
    ],
    select: {
      id: true,
      name: true,
      email: true,
      assignedTasks: {
        where: {
          status: {
            in: [TaskStatus.TODO, TaskStatus.DOING],
          },
        },
        orderBy: [
          { dueDate: "asc" },
          { updatedAt: "desc" },
        ],
        select: {
          id: true,
          title: true,
          status: true,
          dueDate: true,
          updatedAt: true,
        },
      },
    },
  });

  const members: TeamMemberVisibility[] = users.map((user) => {
    const activeTasks = user.assignedTasks;

    const overdueCount = activeTasks.filter(
      (task) => task.dueDate !== null && task.dueDate < now
    ).length;

    const lastActivityAt = activeTasks.reduce<Date | null>((latest, task) => {
      if (!latest || task.updatedAt > latest) {
        return task.updatedAt;
      }

      return latest;
    }, null);

    const sortedTasks: TeamTask[] = activeTasks
      .map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        updatedAt: task.updatedAt.toISOString(),
      }))
      .sort((a, b) => compareTasksByUrgency(a, b, now));

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      activeTaskCount: activeTasks.length,
      overdueCount,
      workload: getWorkload(activeTasks.length),
      lastActivityAt: lastActivityAt ? lastActivityAt.toISOString() : null,
      tasks: sortedTasks.slice(0, 5),
    };
  });

  members.sort((a, b) => {
    if (a.overdueCount !== b.overdueCount) {
      return b.overdueCount - a.overdueCount;
    }

    if (a.activeTaskCount !== b.activeTaskCount) {
      return b.activeTaskCount - a.activeTaskCount;
    }

    return (a.name || a.email).localeCompare(b.name || b.email);
  });

  return NextResponse.json(
    {
      data: {
        currentUserId: currentUser.id,
        members,
      },
    },
    { status: 200 }
  );
}
