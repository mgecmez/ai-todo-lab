/**
 * authService.ts — Ekranların kullandığı auth yardımcı katmanı.
 *
 * loginApi / registerApi üzerinden çağrı yaparak AuthResponse döndürür.
 * Hata mesajları kullanıcı dostu Türkçe string'lere dönüştürülür.
 */

import { loginApi, registerApi } from '../api/authApi';
import type { AuthResponse } from '../api/authApi';

export type { AuthResponse };

export async function register(
  email: string,
  password: string,
): Promise<AuthResponse> {
  try {
    return await registerApi(email, password);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('409') || msg.toLowerCase().includes('conflict') || msg.includes('kayıtlı') || msg.includes('zaten')) {
      throw new Error('Bu e-posta adresi zaten kullanımda.');
    }
    if (msg.includes('400') || msg.includes('Geçersiz')) {
      throw new Error('Geçersiz giriş bilgileri.');
    }
    throw new Error('Kayıt sırasında bir hata oluştu.');
  }
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  try {
    return await loginApi(email, password);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
      throw new Error('E-posta veya şifre hatalı.');
    }
    throw new Error('Giriş sırasında bir hata oluştu.');
  }
}
