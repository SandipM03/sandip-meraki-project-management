import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type DeleteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function DELETE(request: NextRequest, context: DeleteContext) {
  const currentUserId = await getCurrentUserId(request);

  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  if (!projectId) {
    return NextResponse.json({ error: "Project id is required" }, { status: 400 });
  }

  const existing = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx: any) => {
    await tx.comment.deleteMany({
      where: {
        task: {
          projectId,
        },
      },
    });

    await tx.activity.deleteMany({
      where: {
        task: {
          projectId,
        },
      },
    });

    await tx.task.deleteMany({
      where: { projectId },
    });

    await tx.project.delete({
      where: { id: projectId },
    });
  });

  return NextResponse.json({ success: true }, { status: 200 });
}
