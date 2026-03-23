import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

/**
 * Sentry error monitoring module.
 *
 * Usage:
 *   Side-effect import in App.tsx → `import './src/services/monitoring/sentry';`
 *   This triggers initSentry() at module load time, before the React tree mounts.
 *
 * In development profile (EAS_BUILD_PROFILE === 'development' or unset),
 * Sentry is initialized with enabled: false — all capture calls become no-ops.
 */

const dsn: string = (Constants.expoConfig?.extra as { sentryDsn?: string } | undefined)?.sentryDsn ?? '';
const profile: string = (Constants.expoConfig?.extra as { easProfile?: string } | undefined)?.easProfile ?? 'development';
const version: string = Constants.expoConfig?.version ?? '1.0.0';

export function initSentry(): void {
  Sentry.init({
    dsn,
    enabled: profile !== 'development',
    environment: profile,
    release: `aitodolab@${version}`,
    // Disable automatic session tracking in development to reduce noise
    enableAutoSessionTracking: profile !== 'development',
  });
}

// ─── Capture helpers ──────────────────────────────────────────────────────────

export function captureApiError(
  error: unknown,
  context: {
    endpoint: string;
    method: string;
    statusCode?: number;
  },
): void {
  Sentry.withScope((scope) => {
    scope.setTag('layer', 'api');
    scope.setContext('request', context);
    Sentry.captureException(error);
  });
}

export function captureAuthError(
  error: unknown,
  context: {
    operation: 'login' | 'register' | 'refresh' | 'logout';
    userId?: string;
  },
): void {
  Sentry.withScope((scope) => {
    scope.setTag('layer', 'auth');
    scope.setTag('auth.operation', context.operation);
    if (context.userId) {
      scope.setTag('auth.userId', context.userId);
    }
    Sentry.captureException(error);
  });
}

export function captureOfflineSyncError(
  error: unknown,
  context: {
    mutationKey: string;
    failureCount: number;
  },
): void {
  Sentry.withScope((scope) => {
    scope.setTag('layer', 'offline_sync');
    scope.setContext('mutation', context);
    Sentry.captureException(error);
  });
}

// Initialize immediately on module load (side-effect import in App.tsx)
initSentry();
