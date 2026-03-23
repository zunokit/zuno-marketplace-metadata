# External cron setup for `keep-supabase-alive`

## 1. Architecture

```text
cronjob.org  ──GET──▶  /api/cron/keep-supabase-alive
                              │
                Authorization: Bearer CRON_SECRET
                              │
                    ┌─────────┴──────────┐
                    │  ping in parallel  │
                    │  • /api/health     │
                    │  • Supabase REST   │
                    │  • Supabase Auth   │
                    │  • Supabase Storage│
                    │  • Supabase DB RPC │
                    └─────────┬──────────┘
                              │
                         Slack webhook
```

## 2. Env vars

| Variable | Example | Description |
|---|---|---|
| `CRON_SECRET` | `openssl rand -hex 32` | Bearer token required by `/api/cron/keep-supabase-alive`. |
| `SUPABASE_URL` | `https://your-project.supabase.co` | Base URL used for REST, Auth, Storage, and RPC keep-alive pings. |
| `SUPABASE_ANON_KEY` | `eyJ...` | Anon key sent on each Supabase ping. |
| `SLACK_WEBHOOK_URL` | `https://hooks.slack.com/services/...` | Slack Incoming Webhook for success and failure notifications. |

## 3. DB setup

The route already treats `POST /rest/v1/rpc/ping` returning `404` as "Supabase is reachable but the helper function is not installed".

If you want the DB ping to return `200` instead, run this once in the Supabase SQL Editor:

```sql
CREATE OR REPLACE FUNCTION public.ping()
RETURNS integer LANGUAGE sql SECURITY DEFINER AS $$ SELECT 1; $$;
GRANT EXECUTE ON FUNCTION public.ping() TO anon;
```

## 4. Slack webhook

Create an Incoming Webhook in Slack, then copy the webhook URL into `SLACK_WEBHOOK_URL`:

- `https://api.slack.com/apps`
- Open your app
- Go to **Incoming Webhooks**
- Enable webhooks and create one for the target channel

## 5. Deploy

1. Set the env vars in Vercel.
2. Deploy the app with `git push`.
3. Smoke-test the route after deploy:

```bash
curl -i "https://<your-production-domain>/api/cron/keep-supabase-alive" \
  -H "Authorization: Bearer <your-cron-secret>"
```

Expected result:
- `200` when every ping succeeds
- `207` when one or more pings fail
- `401` when the bearer token is missing or wrong

## 6. cronjob.org config

| Field | Value |
|---|---|
| Title | `Keep Supabase Alive` |
| URL | `https://<your-production-domain>/api/cron/keep-supabase-alive` |
| Schedule | `0 6,18 * * *` (06:00 and 18:00 UTC, matching the old workflow) |
| Method | `GET` |
| Header name | `Authorization` |
| Header value | `Bearer <your-cron-secret>` |
| Timeout | `30 seconds` |

## 7. Disable old GitHub Actions

After the external cron is working, disable the old schedule:

```bash
rm .github/workflows/keep-supabase-alive.yml
```

If you prefer the GitHub UI, you can also delete or disable the workflow there after confirming the external cron succeeds.
