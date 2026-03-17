import { onlineManager } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { isNetworkError } from '../../utils/errorMessage';

const PORT = 5100;
const HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const API_BASE_URL = `http://${HOST}:${PORT}`;

// ─── Unauthorized callback registry ──────────────────────────────────────────

let _onUnauthorized: (() => void) | null = null;

export function registerUnauthorizedCallback(fn: () => void): void {
  _onUnauthorized = fn;
}

// ─── apiFetch — auth interceptor ─────────────────────────────────────────────

/**
 * fetch() wrapper:
 *   - SecureStore'dan JWT token okur, Authorization header ekler.
 *   - 401 yanıtında _onUnauthorized callback'ini tetikler (→ logout).
 *   - Ağ hatasında onlineManager'ı false yapar (TanStack offline queue).
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = await SecureStore.getItemAsync('auth_token');

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(path, { ...options, headers });

    if (response.status === 401) {
      _onUnauthorized?.();
    }

    return response;
  } catch (e) {
    if (isNetworkError(e)) {
      onlineManager.setOnline(false);
    }
    throw e;
  }
}
