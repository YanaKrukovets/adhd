This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Model & cost projections

All agents (session + planner) run on **`gemini-3.1-flash-lite`** via `@ai-sdk/google`,
set per agent in `src/lib/agents/{session,planner}.js`. It was chosen as the
cheapest current text model with the most generous free quota.

- **Free tier:** $0 within quota, but daily request caps apply (~tens of
  requests/day). Not sufficient for real usage — see the per-model limits at
  [ai.dev/rate-limit](https://ai.dev/rate-limit). The session agent caps tool
  loops at 3 steps to conserve the free budget.
- **Paid tier:** `gemini-3.1-flash-lite` is fractions of a cent per session
  (a few thousand tokens in/out). Enable billing on the Google project for
  usable limits. Update `MODEL_COSTS` in `src/lib/telemetry.js` if you move off
  the free tier so `agent_calls.cost_usd` stays accurate.
