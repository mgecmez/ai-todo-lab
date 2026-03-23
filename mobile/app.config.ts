import { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * app.config.ts — Dynamic Expo configuration layer.
 *
 * This file extends the static app.json with environment-aware values:
 * - Injects SENTRY_DSN (from EAS secret or local .env) into extra.sentryDsn
 * - Injects EAS_BUILD_PROFILE into extra.easProfile
 * - Registers the @sentry/react-native/expo config plugin
 *
 * app.json is NOT deleted; this file spreads its contents and adds on top.
 * EAS automatically sets EAS_BUILD_PROFILE to "development" | "preview" | "production".
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const profile = process.env.EAS_BUILD_PROFILE ?? 'development';
  const sentryDsn = process.env.SENTRY_DSN ?? '';
  const uploadSourceMaps = profile === 'preview' || profile === 'production';

  return {
    ...config,
    name: config.name ?? 'mobile',
    slug: config.slug ?? 'mobile',
    plugins: [
      ...(config.plugins ?? []),
      [
        '@sentry/react-native/expo',
        {
          organization: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
          // authToken only passed when source map upload is needed (preview + production)
          ...(uploadSourceMaps && { authToken: process.env.SENTRY_AUTH_TOKEN }),
        },
      ],
    ],
    extra: {
      ...config.extra,
      sentryDsn,
      easProfile: profile,
    },
  };
};
