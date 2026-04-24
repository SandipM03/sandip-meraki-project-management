import {
	AUTH_COOKIE_NAME,
	hashPassword,
	prisma,
	signAuthToken,
	verifyAuthToken,
	verifyPassword,
} from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

function getAction(request: NextRequest): string {
	const segments = request.nextUrl.pathname.split("/").filter(Boolean);
	return segments.slice(2).join("/");
}

function setAuthCookie(response: NextResponse, token: string) {
	response.cookies.set(AUTH_COOKIE_NAME, token, {
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		path: "/",
		maxAge: 60 * 60 * 24 * 7,
	});
}

export async function GET(request: NextRequest) {
	const action = getAction(request);

	if (action !== "session") {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
	if (!token) {
		return NextResponse.json({ data: null }, { status: 200 });
	}

	const payload = verifyAuthToken(token);
	if (!payload) {
		const response = NextResponse.json({ data: null }, { status: 200 });
		response.cookies.delete(AUTH_COOKIE_NAME);
		return response;
	}

	const user = await prisma.user.findUnique({
		where: { id: payload.sub },
		select: { id: true, email: true, name: true },
	});

	if (!user) {
		const response = NextResponse.json({ data: null }, { status: 200 });
		response.cookies.delete(AUTH_COOKIE_NAME);
		return response;
	}

	return NextResponse.json({ data: { user } }, { status: 200 });
}

export async function POST(request: NextRequest) {
	const action = getAction(request);

	if (action === "sign-up/email") {
		const body = await request.json();
		const name = typeof body.name === "string" ? body.name.trim() : "";
		const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
		const password = typeof body.password === "string" ? body.password : "";

		if (!email || !password || password.length < 8) {
			return NextResponse.json(
				{ error: { message: "Invalid signup data" } },
				{ status: 400 }
			);
		}

		const existing = await prisma.user.findUnique({ where: { email } });
		if (existing) {
			return NextResponse.json(
				{ error: { message: "Email already in use" } },
				{ status: 409 }
			);
		}

		const hashed = await hashPassword(password);
		const user = await prisma.user.create({
			data: {
				email,
				name: name || null,
				password: hashed,
			},
			select: { id: true, email: true, name: true },
		});

		const token = signAuthToken({
			sub: user.id,
			email: user.email,
			name: user.name,
		});

		const response = NextResponse.json({ data: { user } }, { status: 200 });
		setAuthCookie(response, token);
		return response;
	}

	if (action === "sign-in/email") {
		const body = await request.json();
		const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
		const password = typeof body.password === "string" ? body.password : "";

		if (!email || !password) {
			return NextResponse.json(
				{ error: { message: "Invalid login data" } },
				{ status: 400 }
			);
		}

		const user = await prisma.user.findUnique({ where: { email } });
		if (!user?.password) {
			return NextResponse.json(
				{ error: { message: "Invalid email or password" } },
				{ status: 401 }
			);
		}

		const isValid = await verifyPassword(password, user.password);
		if (!isValid) {
			return NextResponse.json(
				{ error: { message: "Invalid email or password" } },
				{ status: 401 }
			);
		}

		const token = signAuthToken({
			sub: user.id,
			email: user.email,
			name: user.name,
		});

		const response = NextResponse.json(
			{ data: { user: { id: user.id, email: user.email, name: user.name } } },
			{ status: 200 }
		);
		setAuthCookie(response, token);
		return response;
	}

	if (action === "sign-out") {
		const response = NextResponse.json({ data: { success: true } }, { status: 200 });
		response.cookies.delete(AUTH_COOKIE_NAME);
		return response;
	}

	return NextResponse.json({ error: "Not found" }, { status: 404 });
}
