"use client";

import { createAuthClient } from "better-auth/client";
import { adminClient, apiKeyClient } from "better-auth/client/plugins";
import { getCurrentUrl } from "@/shared/lib/utils/url";

const NEXT_PUBLIC_APP_URL = getCurrentUrl();

export const authClient = createAuthClient({
  baseURL: NEXT_PUBLIC_APP_URL,
  plugins: [
    adminClient(),
    apiKeyClient(), // API Key management plugin
  ],
});

// Export commonly used auth functions
export const { signIn, signOut, signUp, useSession } = authClient;

// Types
export type Session = typeof authClient.$Infer.Session;
export type User = typeof authClient.$Infer.Session.user;
