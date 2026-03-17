import { API_BASE_URL } from '../api/config';

export interface AuthServiceResponse {
  token: string;
  userId: string;
  email: string;
}

export async function register(
  email: string,
  password: string,
): Promise<AuthServiceResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (response.status === 409) {
    throw new Error('Bu e-posta adresi zaten kullanımda.');
  }
  if (response.status === 400) {
    throw new Error('Geçersiz giriş bilgileri.');
  }
  if (!response.ok) {
    throw new Error('Kayıt sırasında bir hata oluştu.');
  }

  return response.json() as Promise<AuthServiceResponse>;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthServiceResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (response.status === 401) {
    throw new Error('E-posta veya şifre hatalı.');
  }
  if (!response.ok) {
    throw new Error('Giriş sırasında bir hata oluştu.');
  }

  return response.json() as Promise<AuthServiceResponse>;
}
