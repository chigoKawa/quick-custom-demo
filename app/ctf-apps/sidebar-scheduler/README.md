# Locale Scheduler – Sidebar App

Schedule locale-based **publish** and **unpublish** actions per entry, at different times per locale.

## Problem

Native Scheduled Actions and Launch operate at the full-entry level. This prevents scheduling different go-live times per market (locale) from a single entry.

## Architecture

```
sidebar-scheduler/
├── manifest.json                  # Contentful app manifest
├── page.tsx / layout.tsx          # Next.js app shell
├── components/the-app.tsx         # Location router
├── locations/
│   ├── config-screen.tsx          # App config (API base URL, secret)
│   ├── sidebar.tsx                # Entry sidebar UI
│   └── sidebar.module.css         # Sidebar styles
├── lib/
│   ├── cma-client.ts              # CMA singleton (uses env token)
│   ├── schedule-store.ts          # In-memory schedule storage
│   ├── publish-utils.ts           # Locale publish + reference traversal
│   └── worker.ts                  # Execute due schedules
├── types.ts                       # Shared types
└── README.md

app/api/sidebar-scheduler/
├── schedules/route.ts             # GET/POST/PATCH schedules
└── worker/run/route.ts            # POST execute due / GET health
```

## Setup

1. Set `CONTENTFUL_MANAGEMENT_TOKEN` in your `.env` (server-side, not `NEXT_PUBLIC_*`).
2. Create an app definition in Contentful with locations: **App Config** + **Entry Sidebar**.
3. Set the app URL to your Next.js host (e.g. `http://localhost:3000/ctf-apps/sidebar-scheduler`).
4. Install the app on your space/environment.
5. In the config screen, set **API Base URL** (leave empty for same-origin).

## How to Demo

1. Open any entry → find **Locale Scheduler** in the sidebar.
2. Click **+ New Schedule** → pick locales, date/time, action.
3. Click **▶ Run Due Schedules Now** to execute all pending schedules whose time has arrived.
4. Watch the status update to succeeded/failed with details.

## Publish Policy

- **Publish**: publishes the entry + referenced entries & assets (up to depth 3) for the selected locales only.
- **Unpublish**: unpublishes only the target entry for the selected locales (no cascade to references).

## Limitations (demo/prototype)

- **In-memory storage**: schedules are lost on server restart/redeploy.
- **No automatic cron**: you must click "Run Due Schedules Now" or set up an external cron to `POST /api/sidebar-scheduler/worker/run`.
- **Single instance**: no coordination for multi-instance deployments.

## Upgrade Path (production)

- Replace `schedule-store.ts` with a database or Contentful "localeSchedule" entries.
- Add Vercel Cron / external cron to hit the worker endpoint every minute.
- Add HMAC verification on the API routes.
