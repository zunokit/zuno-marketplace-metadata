import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface PingResult {
  label: string;
  emoji: string;
  ok: boolean;
  status?: number | string;
  error?: string;
  ms: number;
}

const REQUEST_TIMEOUT_MS = 20_000;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getSupabaseConfig(): { url: string; anonKey: string } | { error: string } {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url) {
    return { error: "Missing SUPABASE_URL" };
  }

  if (!anonKey) {
    return { error: "Missing SUPABASE_ANON_KEY" };
  }

  return { url, anonKey };
}

async function pingAppHealth(origin: string): Promise<PingResult> {
  const startTime = Date.now();

  try {
    const response = await fetch(new URL("/api/health", origin), {
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const payload = (await response.json().catch(() => null)) as
      | { status?: string }
      | null;
    const healthStatus = payload?.status;
    const ms = Date.now() - startTime;
    const ok = response.status === 200 && healthStatus !== "unhealthy";

    return {
      label: "App health",
      emoji: "🩺",
      ok,
      status: healthStatus ? `${response.status} (${healthStatus})` : response.status,
      error: ok
        ? undefined
        : healthStatus
          ? `Health status: ${healthStatus}`
          : `HTTP ${response.status}`,
      ms,
    };
  } catch (error) {
    return {
      label: "App health",
      emoji: "🩺",
      ok: false,
      error: getErrorMessage(error),
      ms: Date.now() - startTime,
    };
  }
}

type SupabasePingOptions = {
  path: string;
  label: string;
  emoji: string;
  method?: "GET" | "POST";
  body?: string;
  extraHeaders?: Record<string, string>;
  isOk?: (response: Response) => boolean;
  formatStatus?: (response: Response) => number | string;
};

async function pingSupabaseService({
  path,
  label,
  emoji,
  method = "GET",
  body,
  extraHeaders,
  isOk = (response) => response.ok,
  formatStatus = (response) => response.status,
}: SupabasePingOptions): Promise<PingResult> {
  const startTime = Date.now();
  const config = getSupabaseConfig();

  if ("error" in config) {
    return {
      label,
      emoji,
      ok: false,
      error: config.error,
      ms: 0,
    };
  }

  try {
    const response = await fetch(new URL(path, config.url), {
      method,
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        ...extraHeaders,
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const ms = Date.now() - startTime;
    const ok = isOk(response);

    return {
      label,
      emoji,
      ok,
      status: formatStatus(response),
      error: ok ? undefined : `HTTP ${response.status}`,
      ms,
    };
  } catch (error) {
    return {
      label,
      emoji,
      ok: false,
      error: getErrorMessage(error),
      ms: Date.now() - startTime,
    };
  }
}

async function sendSuccessSlack(results: PingResult[], totalMs: number): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text:
        `✅ Keep-alive OK (${totalMs}ms)\n` +
        results
          .map((result) => {
            const status = result.status !== undefined ? ` · ${result.status}` : "";
            return `${result.emoji} *${result.label}*: ✅ ${result.ms}ms${status}`;
          })
          .join("\n"),
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Slack webhook returned HTTP ${response.status}`);
  }
}

async function sendFailureSlack(results: PingResult[], totalMs: number): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const failed = results.filter((result) => !result.ok);
  const passed = results.filter((result) => result.ok);

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🚨 Keep-Alive FAILED",
            emoji: true,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${failed.length} service(s) failed* out of ${results.length} — ${totalMs}ms`,
          },
        },
        { type: "divider" },
        ...failed.map((result) => ({
          type: "section",
          text: {
            type: "mrkdwn",
            text: [
              `${result.emoji} *${result.label}* ❌`,
              result.status !== undefined ? `  • Status: \`${result.status}\`` : "",
              result.error ? `  • Error: \`${result.error}\`` : "",
              `  • Latency: ${result.ms}ms`,
            ]
              .filter(Boolean)
              .join("\n"),
          },
        })),
        ...(passed.length > 0
          ? [
              { type: "divider" },
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text:
                    "*Still healthy:* " +
                    passed
                      .map((result) => `${result.emoji} ${result.label} (${result.ms}ms)`)
                      .join(" · "),
                },
              },
            ]
          : []),
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `At ${new Date().toUTCString()}`,
            },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Slack webhook returned HTTP ${response.status}`);
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const results = await Promise.all([
    pingAppHealth(req.nextUrl.origin),
    pingSupabaseService({
      path: "/rest/v1/",
      label: "Supabase REST",
      emoji: "🌐",
    }),
    pingSupabaseService({
      path: "/auth/v1/health",
      label: "Supabase Auth",
      emoji: "🔐",
    }),
    pingSupabaseService({
      path: "/storage/v1/status",
      label: "Supabase Storage",
      emoji: "🗂️",
    }),
    pingSupabaseService({
      path: "/rest/v1/rpc/ping",
      label: "Supabase DB",
      emoji: "🗄️",
      method: "POST",
      body: "{}",
      extraHeaders: {
        "Content-Type": "application/json",
      },
      isOk: (response) => response.status === 200 || response.status === 404,
      formatStatus: (response) =>
        response.status === 404 ? "404 (ping function missing)" : response.status,
    }),
  ]);
  const totalMs = Date.now() - startTime;
  const allOk = results.every((result) => result.ok);

  try {
    if (allOk) {
      await sendSuccessSlack(results, totalMs);
    } else {
      await sendFailureSlack(results, totalMs);
    }
  } catch (error) {
    console.error("Slack notification failed", error);
  }

  return NextResponse.json(
    {
      ok: allOk,
      timestamp: new Date().toISOString(),
      totalMs,
      results,
    },
    { status: allOk ? 200 : 207 }
  );
}
