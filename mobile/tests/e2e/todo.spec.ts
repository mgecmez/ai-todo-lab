/**
 * NAV-006 — Navigation Sonrası E2E Testleri
 *
 * Ön koşullar:
 *   - Backend çalışıyor: http://localhost:5100
 *   - Expo Web otomatik başlatılır (veya http://localhost:8081 üzerinde zaten çalışıyor)
 *
 * Çalıştırma:
 *   npm run test:e2e
 *
 * Kapsanan senaryolar:
 *   1) FAB navigation — liste → form ekranına geçiş
 *   2) Create flow    — form doldur → kaydet → listede yeni todo görün
 *   3) Edit flow      — todo'ya tıkla → önceden dolu form → güncelle → listede güncelleme
 *   4) Toggle flow    — ☐ → ☑
 *   5) Delete flow    — API workaround (Alert.alert web'de no-op)
 *   6) Validation     — boş başlık → hata mesajı
 *
 * Bilinen RN Web kısıtlaması:
 *   react-native-web 0.21'de Alert.alert() → static alert() {} (no-op)
 *   Silme onay dialog'u web'de açılmaz.
 *   Silme adımı doğrudan API çağrısı ile yapılır; ardından sayfa yenilenerek
 *   listenin güncellendiği doğrulanır.
 */

import { expect, test } from '@playwright/test';

const API_BASE = 'http://localhost:5100';

// ─── Yardımcı fonksiyonlar ─────────────────────────────────────────────────

async function createTodoViaApi(
  page: import('@playwright/test').Page,
  title: string,
  description?: string,
): Promise<{ id: string; title: string; isCompleted: boolean; createdAt: string }> {
  return page.evaluate(
    async ({ apiBase, title, description }) => {
      const r = await fetch(`${apiBase}/api/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });
      return r.json();
    },
    { apiBase: API_BASE, title, description },
  );
}

async function deleteTodoViaApi(page: import('@playwright/test').Page, id: string): Promise<void> {
  await page.evaluate(
    async ({ apiBase, id }) => {
      await fetch(`${apiBase}/api/todos/${id}`, { method: 'DELETE' });
    },
    { apiBase: API_BASE, id },
  );
}

// ─── Test suite ───────────────────────────────────────────────────────────

test.describe('Navigation Akışları', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Görevlerim')).toBeVisible({ timeout: 15_000 });
  });

  /**
   * SENARYO 1 — FAB navigation: liste ekranından form ekranına geçiş
   */
  test('FAB tıklama form ekranına yönlendirir', async ({ page }) => {
    await page.getByText('+').click();

    // Header başlığı "Yeni Görev" olmalı
    await expect(page.getByText('Yeni Görev')).toBeVisible({ timeout: 6_000 });

    // Form elemanları görünmeli
    await expect(page.getByPlaceholder('Görev başlığı')).toBeVisible();
    await expect(page.getByPlaceholder('İsteğe bağlı açıklama')).toBeVisible();
    await expect(page.getByText('Kaydet')).toBeVisible();
    await expect(page.getByText('İptal')).toBeVisible();
  });

  /**
   * SENARYO 2 — Create flow: form doldur → kaydet → listede görün
   */
  test('yeni todo oluşturulur ve listede görünür', async ({ page }) => {
    const title = `Yeni Görev ${Date.now()}`;

    await page.getByText('+').click();
    await expect(page.getByText('Yeni Görev')).toBeVisible({ timeout: 6_000 });

    await page.getByPlaceholder('Görev başlığı').fill(title);
    await page.getByPlaceholder('İsteğe bağlı açıklama').fill('Test açıklaması');
    await page.getByText('Kaydet').click();

    // Kaydet sonrası liste ekranına dönmeli
    await expect(page.getByText('Görevlerim')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(title)).toBeVisible({ timeout: 8_000 });

    // Temizlik
    const todos = await page.evaluate(
      async (apiBase) => {
        const r = await fetch(`${apiBase}/api/todos`);
        return r.json() as Promise<{ id: string; title: string }[]>;
      },
      API_BASE,
    );
    const created = todos.find((t) => t.title === title);
    if (created) await deleteTodoViaApi(page, created.id);
  });

  /**
   * SENARYO 3 — Edit flow: todo başlığına tıkla → önceden dolu form → güncelle → listede güncelleme
   */
  test('todo düzenlenir ve listede güncellenir', async ({ page }) => {
    const originalTitle = `Düzenlenecek ${Date.now()}`;
    const updatedTitle = `Güncellendi ${Date.now()}`;

    // API ile todo oluştur
    const created = await createTodoViaApi(page, originalTitle);

    // Sayfayı yenile → liste güncellenir
    await page.reload();
    await expect(page.getByText('Görevlerim')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(originalTitle)).toBeVisible({ timeout: 8_000 });

    // Todo başlığına tıkla → form ekranı açılmalı
    await page.getByText(originalTitle).first().click();

    // Header başlığı "Görevi Düzenle" olmalı
    await expect(page.getByText('Görevi Düzenle')).toBeVisible({ timeout: 6_000 });

    // Başlık alanı önceden dolu olmalı
    await expect(page.getByPlaceholder('Görev başlığı')).toHaveValue(originalTitle);

    // Başlığı güncelle ve kaydet
    await page.getByPlaceholder('Görev başlığı').clear();
    await page.getByPlaceholder('Görev başlığı').fill(updatedTitle);
    await page.getByText('Güncelle').click();

    // Liste ekranına dönmeli ve güncellenmiş başlık görünmeli
    await expect(page.getByText('Görevlerim')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(updatedTitle)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(originalTitle)).not.toBeVisible();

    // Temizlik
    await deleteTodoViaApi(page, created.id);
  });

  /**
   * SENARYO 4 — Toggle flow: ☐ → ☑
   */
  test('todo toggle edilir (☐ → ☑)', async ({ page }) => {
    const title = `Toggle Görev ${Date.now()}`;
    const created = await createTodoViaApi(page, title);

    await page.reload();
    await expect(page.getByText('Görevlerim')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(title)).toBeVisible({ timeout: 8_000 });

    // İlk ☐ ikonu bize ait todo (en üstte)
    await page.getByText('☐').first().click();

    // ☑ görünmeli
    await expect(page.getByText('☑').first()).toBeVisible({ timeout: 6_000 });
    // Başlık hâlâ görünür (üstü çizili)
    await expect(page.getByText(title)).toBeVisible();

    // Temizlik
    await deleteTodoViaApi(page, created.id);
  });

  /**
   * SENARYO 5 — Delete flow (API workaround)
   *
   * Alert.alert() react-native-web 0.21'de no-op olduğundan trash butonu
   * onayı dialog açmaz. Silme doğrudan API üzerinden test edilir.
   */
  test('todo silinir ve listede kaybolur', async ({ page }) => {
    const title = `Silinecek Görev ${Date.now()}`;
    const created = await createTodoViaApi(page, title);

    await page.reload();
    await expect(page.getByText('Görevlerim')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(title)).toBeVisible({ timeout: 8_000 });

    // API ile sil
    await deleteTodoViaApi(page, created.id);

    // Sayfayı yenile → todo kaybolmalı
    await page.reload();
    await expect(page.getByText('Görevlerim')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(title)).not.toBeVisible({ timeout: 6_000 });
  });

  /**
   * SENARYO 6 — Form validation: boş başlık → hata mesajı
   */
  test('geçersiz başlıkla kayıt denemesi hata gösterir', async ({ page }) => {
    await page.getByText('+').click();
    await expect(page.getByText('Yeni Görev')).toBeVisible({ timeout: 6_000 });

    // Başlık boş bırak ve kaydet
    await page.getByText('Kaydet').click();

    // Client-side validasyon mesajı görünmeli
    await expect(page.getByText('Başlık alanı zorunludur.')).toBeVisible();

    // Form ekranında kalmaya devam etmeli (navigasyon olmaz)
    await expect(page.getByPlaceholder('Görev başlığı')).toBeVisible();
  });
});
