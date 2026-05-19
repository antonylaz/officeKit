import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const baseConfig: NextConfig = {
  reactStrictMode: true,
};

const intlWrapped = withNextIntl(baseConfig);

let finalConfig: NextConfig = intlWrapped;

if (process.env.SENTRY_DSN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT) {
  // Dynamic import to avoid loading @sentry/nextjs when not configured
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { withSentryConfig } = require("@sentry/nextjs");
  finalConfig = withSentryConfig(intlWrapped, {
    org: process.env.SENTRY_ORG!,
    project: process.env.SENTRY_PROJECT!,
    silent: !process.env.CI,
    widenClientFileUpload: true,
    disableLogger: true,
  });
}

export default finalConfig;
