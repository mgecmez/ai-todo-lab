/**
 * authApi.ts — Raw fetch tabanlı auth API fonksiyonları.
 *
 * IMPORTANT: Bu dosya apiFetch'i DEĞİL, raw fetch'i kullanır.
 * Bunun nedeni: apiFetch 401 yanıtında refresh token döngüsünü tetikler.
 * Login/register/refresh endpoint'leri bu döngünün dışında kalmalıdır.
 */

import { captureAuthError } from '../monitoring/sentry';
import { API_BASE_URL } from './config';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function parseAuthResponse(response: Response): Promise<AuthResponse> {
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = await response.json() as { message?: string; title?: string };
      message = body?.message ?? body?.title ?? message;
    } catch {
      // JSON parse edilemezse ham mesajı kullan
    }
    throw new Error(message);
  }
  return response.json() as Promise<AuthResponse>;
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function loginApi(
  email: string,
  password: string,
): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return await parseAuthResponse(response);
  } catch (error) {
    captureAuthError(error, { operation: 'login' });
    throw error;
  }
}

export async function registerApi(
  email: string,
  password: string,
): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return await parseAuthResponse(response);
  } catch (error) {
    captureAuthError(error, { operation: 'register' });
    throw error;
  }
}

export async function refreshTokenApi(
  refreshToken: string,
): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    return await parseAuthResponse(response);
  } catch (error) {
    captureAuthError(error, { operation: 'refresh' });
    throw error;
  }
}

export async function logoutApi(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ refreshToken }),
  });

  // Logout best-effort: 204 veya 401 dönerse sorun yok, sadece throw
  if (!response.ok && response.status !== 401) {
    throw new Error(`Logout failed: HTTP ${response.status}`);
  }
}
