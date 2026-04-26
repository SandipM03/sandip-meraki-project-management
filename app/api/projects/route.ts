import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { ProjectStatus } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const currentUserId = await getCurrentUserId(request);
  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const projects = await prisma.project.findMany({
      include: {
        client: true,
        owner: true,
      },
    });
    return NextResponse.json(projects);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId(request);

    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, clientId, ownerId, dueDate, status } = await request.json();

    if (!name || !clientId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const parsedDueDate =
      typeof dueDate === "string" && dueDate.trim()
        ? new Date(dueDate)
        : undefined;

    if (parsedDueDate && Number.isNaN(parsedDueDate.getTime())) {
      return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
    }

    const normalizedStatus =
      typeof status === "string" &&
      (Object.values(ProjectStatus) as string[]).includes(status)
        ? (status as ProjectStatus)
        : ProjectStatus.ACTIVE;

    const project = await prisma.project.create({
      data: {
        name,
        client: { connect: { id: clientId } },
        owner: { connect: { id: ownerId || currentUserId } },
        dueDate: parsedDueDate,
        status: normalizedStatus,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
