import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import * as SecureStore from 'expo-secure-store';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { registerUnauthorizedCallback } from '../services/api/config';
import { logoutApi } from '../services/api/authApi';
import { AUTH_REFRESH_TOKEN_KEY } from '../services/cache/cacheKeys';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  userId: string | null;
  email: string | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (accessToken: string, refreshToken: string, userId: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateEmail: (newEmail: string) => Promise<void>;
}

// ─── Secure Store Keys ────────────────────────────────────────────────────────

const KEY_TOKEN   = 'auth_token';
const KEY_USER_ID = 'auth_userId';
const KEY_EMAIL   = 'auth_email';

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const [state, setState] = useState<AuthState>({
    token: null,
    refreshToken: null,
    userId: null,
    email: null,
    isLoading: true,
  });

  // userId ve token değerlerini logout içinde kullanabilmek için ref'te tut
  const userIdRef = useRef<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);

  useEffect(() => {
    userIdRef.current = state.userId;
  }, [state.userId]);

  useEffect(() => {
    tokenRef.current = state.token;
  }, [state.token]);

  useEffect(() => {
    refreshTokenRef.current = state.refreshToken;
  }, [state.refreshToken]);

  // Mount sırasında SecureStore'dan mevcut oturumu restore et
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const [token, storedRefreshToken, userId, email] = await Promise.all([
          SecureStore.getItemAsync(KEY_TOKEN),
          SecureStore.getItemAsync(AUTH_REFRESH_TOKEN_KEY),
          SecureStore.getItemAsync(KEY_USER_ID),
          SecureStore.getItemAsync(KEY_EMAIL),
        ]);

        if (!cancelled) {
          if (token && userId) {
            Sentry.setUser({ id: userId, email: email ?? undefined });
          } else {
            Sentry.setUser(null);
          }
          setState({ token, refreshToken: storedRefreshToken, userId, email, isLoading: false });
        }
      } catch {
        if (!cancelled) {
          Sentry.setUser(null);
          setState({ token: null, refreshToken: null, userId: null, email: null, isLoading: false });
        }
      }
    }

    void restoreSession();
    return () => { cancelled = true; };
  }, []);

  const logout = useCallback(async () => {
    const currentUserId = userIdRef.current;
    const currentToken = tokenRef.current;
    const currentRefreshToken = refreshTokenRef.current;

    // Best-effort: sunucu tarafında refresh token'ı iptal et
    if (currentToken && currentRefreshToken) {
      try {
        await logoutApi(currentToken, currentRefreshToken);
      } catch {
        // Sunucu hatası logout'u engellemez
      }
    }

    await Promise.all([
      SecureStore.deleteItemAsync(KEY_TOKEN),
      SecureStore.deleteItemAsync(KEY_USER_ID),
      SecureStore.deleteItemAsync(KEY_EMAIL),
      SecureStore.deleteItemAsync(AUTH_REFRESH_TOKEN_KEY),
    ]);

    queryClient.clear();

    if (currentUserId) {
      await AsyncStorage.removeItem(`todos_cache_${currentUserId}`);
    }

    Sentry.setUser(null);
    setState({ token: null, refreshToken: null, userId: null, email: null, isLoading: false });
  }, [queryClient]);

  const updateEmail = useCallback(async (newEmail: string) => {
    await SecureStore.setItemAsync(KEY_EMAIL, newEmail);
    setState(prev => ({ ...prev, email: newEmail }));
  }, []);

  const login = useCallback(
    async (accessToken: string, refreshToken: string, userId: string, email: string) => {
      await Promise.all([
        SecureStore.setItemAsync(KEY_TOKEN, accessToken),
        SecureStore.setItemAsync(AUTH_REFRESH_TOKEN_KEY, refreshToken),
        SecureStore.setItemAsync(KEY_USER_ID, userId),
        SecureStore.setItemAsync(KEY_EMAIL, email),
      ]);
      Sentry.setUser({ id: userId, email });
      setState({ token: accessToken, refreshToken, userId, email, isLoading: false });
    },
    [],
  );

  // 401 yanıtında otomatik logout
  useEffect(() => {
    registerUnauthorizedCallback(() => { void logout(); });
  }, [logout]);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    updateEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
