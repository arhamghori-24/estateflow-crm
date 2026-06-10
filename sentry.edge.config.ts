import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.APP_ENV ?? "development",
  tracesSampleRate: 0.1,
  enabled: !!process.env.SENTRY_DSN,
});
