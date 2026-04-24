"use client";

import { useEffect, useState } from "react";

type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

type SessionData = {
  user: AuthUser;
} | null;

type CallbackContext = {
  error: {
    message: string;
  };
};

type AuthCallbacks = {
  onSuccess?: () => void;
  onError?: (ctx: CallbackContext) => void;
};

async function authRequest(path: string, options: RequestInit = {}) {
  const response = await fetch(`/api/auth/${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { response, data };
}

export const signUp = {
  email: async (
    values: { email: string; password: string; name?: string },
    callbacks?: AuthCallbacks
  ) => {
    const { response, data } = await authRequest("sign-up/email", {
      method: "POST",
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const message =
        (data as { error?: { message?: string } } | null)?.error?.message ||
        "Signup failed";
      callbacks?.onError?.({ error: { message } });
      return null;
    }

    callbacks?.onSuccess?.();
    return data;
  },
};

export const signIn = {
  email: async (
    values: { email: string; password: string },
    callbacks?: AuthCallbacks
  ) => {
    const { response, data } = await authRequest("sign-in/email", {
      method: "POST",
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const message =
        (data as { error?: { message?: string } } | null)?.error?.message ||
        "Login failed";
      callbacks?.onError?.({ error: { message } });
      return null;
    }

    callbacks?.onSuccess?.();
    return data;
  },
};

export async function signOut() {
  await authRequest("sign-out", {
    method: "POST",
  });
}

export function useSession() {
  const [data, setData] = useState<SessionData>(null);
  const [isPending, setIsPending] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const { response, data } = await authRequest("session", {
          method: "GET",
        });

        if (!isMounted) return;

        if (!response.ok) {
          setData(null);
          return;
        }

        setData(
          ((data as { data?: SessionData } | null)?.data as SessionData) ?? null
        );
      } catch {
        if (!isMounted) return;
        setData(null);
      } finally {
        if (isMounted) {
          setIsPending(false);
        }
      }
    };

    loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  return { data, isPending };
}
