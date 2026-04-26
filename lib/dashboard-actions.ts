"use server";

import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { cookies } from "next/headers";

async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, name: true },
  });

  return user;
}

export async function getDashboardData() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const userId = user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's tasks (all tasks due today)
    const todaysTasks = await prisma.task.findMany({
      where: {
        dueDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        assignedTo: true,
        createdBy: true,
        project: true,
      },
      orderBy: { dueDate: "asc" },
    });

    // Get overdue tasks
    const overdueTasks = await prisma.task.findMany({
      where: {
        dueDate: {
          lt: today,
        },
        status: {
          not: "DONE",
        },
      },
      include: {
        assignedTo: true,
        createdBy: true,
        project: true,
      },
      orderBy: { dueDate: "asc" },
    });

    // Get active projects with task counts
    const activeProjects = await prisma.project.findMany({
      where: {
        status: {
          in: ["ACTIVE", "REVIEW"],
        },
      },
      include: {
        _count: {
          select: {
            tasks: true,
          },
        },
        tasks: {
          where: {
            status: {
              not: "DONE",
            },
          },
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Get tasks by status (for kanban board)
    const tasksByStatus = await prisma.task.findMany({
      where: {
        status: {
          in: ["TODO", "DOING", "DONE"],
        },
      },
      include: {
        assignedTo: true,
        project: true,
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
      take: 21, // 7 tasks per column max
    });

    // Get recent activities
    const recentActivities = await prisma.activity.findMany({
      include: {
        user: true,
        task: {
          include: {
            project: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Get user's assigned tasks
    const myTasks = await prisma.task.findMany({
      where: {
        assignedToId: userId,
      },
      include: {
        project: true,
      },
      orderBy: { dueDate: "asc" },
      take: 10,
    });

    // Quick stats
    const stats = {
      tasksToday: todaysTasks.length,
      overdue: overdueTasks.length,
      inProgress: tasksByStatus.filter((t) => t.status === "DOING").length,
      myTasks: myTasks.length,
    };

    return {
      success: true,
      data: {
        todaysTasks,
        overdueTasks,
        activeProjects,
        tasksByStatus,
        recentActivities,
        myTasks,
        stats,
      },
    };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return { success: false, error: "Failed to fetch dashboard data" };
  }
}

export async function updateTaskStatus(
  taskId: string,
  status: "TODO" | "DOING" | "DONE"
) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: { status },
      include: {
        project: true,
        assignedTo: true,
      },
    });

    // Create activity log
    await prisma.activity.create({
      data: {
        type: "TASK_UPDATED",
        taskId,
        userId: user.id,
        entityId: taskId,
      },
    });

    return { success: true, data: task };
  } catch (error) {
    console.error("Error updating task status:", error);
    return { success: false, error: "Failed to update task status" };
  }
}
