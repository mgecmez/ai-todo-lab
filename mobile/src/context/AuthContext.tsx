import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthState {
  token: string | null;
  userId: string | null;
  email: string | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (token: string, userId: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
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
    userId: null,
    email: null,
    isLoading: true,
  });

  // userId'yi logout içinde kullanabilmek için ref'te tut
  const userIdRef = useRef<string | null>(null);
  useEffect(() => {
    userIdRef.current = state.userId;
  }, [state.userId]);

  // Mount sırasında SecureStore'dan mevcut oturumu restore et
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const [token, userId, email] = await Promise.all([
          SecureStore.getItemAsync(KEY_TOKEN),
          SecureStore.getItemAsync(KEY_USER_ID),
          SecureStore.getItemAsync(KEY_EMAIL),
        ]);

        if (!cancelled) {
          setState({ token, userId, email, isLoading: false });
        }
      } catch {
        if (!cancelled) {
          setState({ token: null, userId: null, email: null, isLoading: false });
        }
      }
    }

    void restoreSession();
    return () => { cancelled = true; };
  }, []);

  const logout = useCallback(async () => {
    const currentUserId = userIdRef.current;

    await Promise.all([
      SecureStore.deleteItemAsync(KEY_TOKEN),
      SecureStore.deleteItemAsync(KEY_USER_ID),
      SecureStore.deleteItemAsync(KEY_EMAIL),
    ]);

    queryClient.clear();

    if (currentUserId) {
      await AsyncStorage.removeItem(`todos_cache_${currentUserId}`);
    }

    setState({ token: null, userId: null, email: null, isLoading: false });
  }, [queryClient]);

  const login = useCallback(
    async (token: string, userId: string, email: string) => {
      await Promise.all([
        SecureStore.setItemAsync(KEY_TOKEN, token),
        SecureStore.setItemAsync(KEY_USER_ID, userId),
        SecureStore.setItemAsync(KEY_EMAIL, email),
      ]);
      setState({ token, userId, email, isLoading: false });
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
