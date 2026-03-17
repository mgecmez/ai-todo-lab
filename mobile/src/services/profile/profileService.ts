import { API_BASE_URL, apiFetch } from '../api/config';

export interface UserProfile {
  userId: string;
  email: string;
  createdAt: string;
}

export async function getProfile(): Promise<UserProfile> {
  const response = await apiFetch(`${API_BASE_URL}/api/auth/me`);

  if (!response.ok) {
    throw new Error('Profil bilgileri alınırken bir hata oluştu.');
  }

  return response.json() as Promise<UserProfile>;
}

export async function changeEmail(
  currentPassword: string,
  newEmail: string,
): Promise<{ userId: string; email: string }> {
  const response = await apiFetch(`${API_BASE_URL}/api/auth/email`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newEmail }),
    skipUnauthorized: true,
  });

  if (response.status === 401) {
    throw new Error('Mevcut şifreniz hatalı.');
  }

  if (response.status === 409) {
    throw new Error('Bu e-posta adresi zaten kullanımda.');
  }

  if (response.status === 400) {
    let body: { errors?: Record<string, string[]> } = {};
    try {
      body = await response.json();
    } catch {
      // body parse edilemezse errors yok sayılır
    }

    const errors = body.errors ?? {};
    const hasEmailValidationError = Object.keys(errors).some(
      key => key.toLowerCase() === 'newemail' && errors[key].length > 0,
    );

    if (hasEmailValidationError) {
      throw new Error('Geçerli bir e-posta adresi girin.');
    }

    throw new Error('Yeni e-posta adresiniz mevcut adresinizle aynı.');
  }

  if (!response.ok) {
    throw new Error('E-posta değiştirilirken bir hata oluştu.');
  }

  return response.json() as Promise<{ userId: string; email: string }>;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/api/auth/password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
    skipUnauthorized: true,
  });

  if (response.status === 401) {
    throw new Error('Mevcut şifreniz hatalı.');
  }

  if (response.status === 400) {
    let body: { errors?: Record<string, string[]> } = {};
    try {
      body = await response.json();
    } catch {
      // body parse edilemezse errors yok sayılır
    }

    const errors = body.errors ?? {};
    const hasPasswordValidationError = Object.keys(errors).some(
      key => key.toLowerCase() === 'newpassword' && errors[key].length > 0,
    );

    if (hasPasswordValidationError) {
      throw new Error('Şifre en az 8 karakter olmalıdır.');
    }

    throw new Error('Yeni şifreniz mevcut şifrenizle aynı olamaz.');
  }

  if (!response.ok) {
    throw new Error('Şifre değiştirilirken bir hata oluştu.');
  }
}

export async function deleteAccount(currentPassword: string): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/api/auth/account`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword }),
    skipUnauthorized: true,
  });

  if (response.status === 401) {
    throw new Error('Şifreniz hatalı.');
  }

  if (!response.ok) {
    throw new Error('Hesap silinirken bir hata oluştu.');
  }
}
