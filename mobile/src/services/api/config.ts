import { onlineManager } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { isNetworkError } from '../../utils/errorMessage';
import { AUTH_REFRESH_TOKEN_KEY } from '../cache/cacheKeys';
import { refreshTokenApi } from './authApi';

const PORT = 5100;
const HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const API_BASE_URL = `http://${HOST}:${PORT}`;

// ─── Unauthorized callback registry ──────────────────────────────────────────

let _onUnauthorized: (() => void) | null = null;

export function registerUnauthorizedCallback(fn: () => void): void {
  _onUnauthorized = fn;
}

// ─── Refresh token queue ──────────────────────────────────────────────────────

let isRefreshing = false;
let waitQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

// ─── apiFetch — auth interceptor + token refresh ──────────────────────────────

/**
 * fetch() wrapper:
 *   - SecureStore'dan JWT token okur, Authorization header ekler.
 *   - 401 yanıtında refresh token ile yeni access token alır.
 *   - Refresh başarısızsa _onUnauthorized callback'ini tetikler (→ logout).
 *   - Birden fazla eş zamanlı 401 isteğini queue'ya alır, tek refresh yapar.
 *   - Ağ hatasında onlineManager'ı false yapar (TanStack offline queue).
 */
export async function apiFetch(
  path: string,
  options: RequestInit & { skipUnauthorized?: boolean } = {},
): Promise<Response> {
  const { skipUnauthorized, ...fetchOptions } = options;
  const token = await SecureStore.getItemAsync('auth_token');

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(path, { ...fetchOptions, headers });
  } catch (e) {
    if (isNetworkError(e)) {
      onlineManager.setOnline(false);
    }
    throw e;
  }

  // 401 olmayan veya skipUnauthorized=true ise direkt döndür
  if (response.status !== 401 || skipUnauthorized) {
    return response;
  }

  // ── 401 alındı: refresh token ile yenile ────────────────────────────────────

  if (isRefreshing) {
    // Başka bir refresh zaten sürüyor — queue'ya ekle ve bekle
    const newToken = await new Promise<string>((resolve, reject) => {
      waitQueue.push({ resolve, reject });
    });
    // Yeni token ile isteği yeniden dene
    return fetch(path, {
      ...fetchOptions,
      headers: { ...fetchOptions.headers as Record<string, string>, Authorization: `Bearer ${newToken}` },
    });
  }

  isRefreshing = true;

  try {
    const stored = await SecureStore.getItemAsync(AUTH_REFRESH_TOKEN_KEY);
    if (!stored) {
      throw new Error('No refresh token');
    }

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await refreshTokenApi(stored);

    // Yeni token'ları kaydet
    await SecureStore.setItemAsync('auth_token', newAccessToken);
    await SecureStore.setItemAsync(AUTH_REFRESH_TOKEN_KEY, newRefreshToken);

    // Queue'daki bekleyen isteklere yeni token'ı ilet
    waitQueue.forEach(({ resolve }) => resolve(newAccessToken));
    waitQueue = [];

    // Orijinal isteği yeni token ile yeniden dene
    return fetch(path, {
      ...fetchOptions,
      headers: { ...fetchOptions.headers as Record<string, string>, Authorization: `Bearer ${newAccessToken}` },
    });
  } catch {
    // Refresh başarısız — tüm bekleyen istekleri reddet ve logout yap
    waitQueue.forEach(({ reject }) => reject(new Error('Session expired')));
    waitQueue = [];
    _onUnauthorized?.();
    throw new Error('Session expired');
  } finally {
    isRefreshing = false;
  }
}
