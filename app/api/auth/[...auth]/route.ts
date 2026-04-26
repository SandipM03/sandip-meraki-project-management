import { AUTH_COOKIE_NAME, hashPassword, signAuthToken, verifyAuthToken, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type AuthErrorCode =
	| "AUTH_CONFIG_JWT_SECRET_MISSING"
	| "AUTH_CONFIG_DATABASE_URL_MISSING"
	| "AUTH_DATABASE_UNAVAILABLE"
	| "AUTH_UNEXPECTED_ERROR";

function getAuthErrorDetails(error: unknown): { code: AuthErrorCode; message: string } {
	if (!process.env.JWT_SECRET) {
		return {
			code: "AUTH_CONFIG_JWT_SECRET_MISSING",
			message: "Server auth secret is missing",
		};
	}

	if (!process.env.DATABASE_URL) {
		return {
			code: "AUTH_CONFIG_DATABASE_URL_MISSING",
			message: "Database URL is missing",
		};
	}

	const maybeError = error as { message?: string; code?: string } | null;
	const message = (maybeError?.message || "").toLowerCase();
	const code = (maybeError?.code || "").toUpperCase();

	if (
		message.includes("database") ||
		message.includes("connect") ||
		message.includes("timeout") ||
		message.includes("prisma") ||
		["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "P1000", "P1001", "P1002"].includes(code)
	) {
		return {
			code: "AUTH_DATABASE_UNAVAILABLE",
			message: "Database is unavailable",
		};
	}

	return {
		code: "AUTH_UNEXPECTED_ERROR",
		message: "Unexpected auth error",
	};
}

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
	try {
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
	} catch (error) {
		const details = getAuthErrorDetails(error);
		console.error("Auth route error:", details.code, error);
		return NextResponse.json(
			{ error: { message: details.message, code: details.code } },
			{ status: 500 }
		);
	}
}
