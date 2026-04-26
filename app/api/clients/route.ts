import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";

async function getCurrentUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyAuthToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true },
  });
  return user?.id ?? null;
}

export async function GET(request: NextRequest) {
  const currentUserId = await getCurrentUserId(request);
  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const clients = await prisma.client.findMany({
      include: {
        projects: true,
        _count: {
          select: { projects: true, tasks: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(clients);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name, status } = await request.json();

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Client name is required" },
        { status: 400 }
      );
    }

    const client = await prisma.client.create({
      data: {
        name: name.trim(),
        status: status || "ACTIVE"
      },
      include: {
        projects: true,
        _count: {
          select: { projects: true, tasks: true }
        }
      }
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}
