/**
 * DESIGN-011 — UI Redesign & TaskDetail Akışı E2E Testleri
 *
 * Ön koşullar:
 *   - Backend çalışıyor: http://localhost:5100
 *   - Expo Web otomatik başlatılır (veya http://localhost:8081 üzerinde zaten çalışıyor)
 *
 * Çalıştırma:
 *   npm run test:e2e
 *
 * Kapsanan senaryolar:
 *   1) Liste ekranı yeni tasarım      — search bar, FAB, todo kartı görünür
 *   2) SearchBar filtreleme           — daraltma, bulunamadı mesajı, temizleme
 *   3) Kart body → TaskDetail         — başlık ve aksiyon butonları görünür
 *   4) TaskDetail toggle              — "Tamamla" → "Geri Al", durum etiketi güncellenir
 *   5) TaskDetail Düzenle akışı       — form açılır, güncellenir, listede yansır
 *   6) FAB → Yeni görev formu        — form elemanları görünür
 *   7) Create flow                    — form doldur → kaydet → listede görün
 *   8) Delete flow                    — API workaround (Alert.alert web'de no-op)
 *   9) Form validation                — boş başlık → hata mesajı
 *
 * Bilinen RN Web kısıtlamaları:
 *   - Alert.alert() react-native-web 0.21'de static no-op; silme onayı web'de açılmaz.
 *     Silme adımı doğrudan API çağrısı ile test edilir.
 *   - Toggle checkbox ikonu Ionicons SVG'dir; metin seçici ile hedeflenemez.
 *     Toggle, TaskDetail ekranındaki "Tamamla" / "Geri Al" buton etiketi ile test edilir.
 *   - Kart içi kalem (pencil) ikonu için erişilebilir etiket yok; doğrudan edit testi
 *     TaskDetail → Düzenle akışı ile kapsamlıdır.
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

test.describe('DESIGN-011: Yeni UI & TaskDetail Akışları', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Görevlerim')).toBeVisible({ timeout: 15_000 });
  });

  /**
   * SENARYO 1 — Liste ekranı yeni tasarımla açılır
   * Search bar, FAB ve todo kartı DOM'da görünür olmalı.
   */
  test('liste ekranı search bar, FAB ve todo kartları gösterir', async ({ page }) => {
    const title = `Liste Test ${Date.now()}`;
    const created = await createTodoViaApi(page, title, 'Açıklama metni');

    await page.reload();
    await expect(page.getByText('Görevlerim')).toBeVisible({ timeout: 15_000 });

    // SearchBar
    await expect(page.getByPlaceholder('Görev ara...')).toBeVisible();

    // Floating Action Button (accessibilityLabel → aria-label)
    await expect(page.getByRole('button', { name: 'Yeni görev ekle' })).toBeVisible();

    // Todo kartı
    await expect(page.getByText(title)).toBeVisible({ timeout: 8_000 });

    // Temizlik
    await deleteTodoViaApi(page, created.id);
  });

  /**
   * SENARYO 2 — SearchBar client-side filtreleme
   * Eşleşen sonuç gösterilir → bulunamadı mesajı → temizleme.
   */
  test('search bar todo listesini filtreler', async ({ page }) => {
    const title = `Aranacak ${Date.now()}`;
    const created = await createTodoViaApi(page, title);

    await page.reload();
    await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });

    const searchBar = page.getByPlaceholder('Görev ara...');

    // Eşleşen terim → todo görünür
    await searchBar.fill('Aranacak');
    await expect(page.getByText(title)).toBeVisible({ timeout: 4_000 });

    // Eşleşmeyen terim → bulunamadı mesajı
    await searchBar.fill('BULUNAMAYACAK_XYZ_999');
    await expect(page.getByText(/için sonuç bulunamadı/)).toBeVisible({ timeout: 4_000 });

    // SearchBar temizle → todo tekrar görünür
    await searchBar.clear();
    await expect(page.getByText(title)).toBeVisible({ timeout: 4_000 });

    // Temizlik
    await deleteTodoViaApi(page, created.id);
  });

  /**
   * SENARYO 3 — Kart body tıklaması TaskDetail ekranını açar
   * Başlık, durum bilgisi ve üç aksiyon butonu görünür.
   */
  test('kart body tıklaması TaskDetail ekranını açar', async ({ page }) => {
    const title = `Detail Test ${Date.now()}`;
    const created = await createTodoViaApi(page, title, 'Detail açıklaması');

    await page.reload();
    await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });

    // Kart body → TaskDetail
    await page.getByText(title).first().click();

    // TaskDetail'e özgü elemanlar görünür olmalı (başlık metni liste kartında da bulunduğundan
    // durum etiketi ve aksiyon butonlarıyla doğrulama yapılır)
    await expect(page.getByText('Devam ediyor')).toBeVisible({ timeout: 6_000 });

    // Üç aksiyon butonu
    await expect(page.getByText('Düzenle')).toBeVisible();
    await expect(page.getByText('Tamamla')).toBeVisible();
    await expect(page.getByText('Sil')).toBeVisible();

    // Temizlik
    await deleteTodoViaApi(page, created.id);
  });

  /**
   * SENARYO 4 — TaskDetail içinden toggle
   * "Tamamla" tıklandıktan sonra "Geri Al" ve "Tamamlandı" görünür.
   */
  test('TaskDetail toggle tamamlandı durumunu değiştirir', async ({ page }) => {
    const title = `Toggle Detail ${Date.now()}`;
    const created = await createTodoViaApi(page, title);

    await page.reload();
    await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });
    await page.getByText(title).first().click();

    await expect(page.getByText('Tamamla')).toBeVisible({ timeout: 6_000 });
    await expect(page.getByText('Devam ediyor')).toBeVisible();

    // Toggle: tamamla
    await page.getByText('Tamamla').click();

    // Buton etiketi ve durum metni değişmeli
    await expect(page.getByText('Geri Al')).toBeVisible({ timeout: 6_000 });
    await expect(page.getByText('Tamamlandı')).toBeVisible();

    // Temizlik
    await deleteTodoViaApi(page, created.id);
  });

  /**
   * SENARYO 5 — TaskDetail Düzenle akışı
   * Detail → form → güncelle → liste (TaskDetail kendini pop'lar; liste yenilenir).
   */
  test('TaskDetail Düzenle butonu formu açar ve güncelleme listeye yansır', async ({ page }) => {
    const originalTitle = `Detail Edit ${Date.now()}`;
    const updatedTitle = `Güncellendi Detail ${Date.now()}`;
    const created = await createTodoViaApi(page, originalTitle);

    await page.reload();
    await expect(page.getByText(originalTitle)).toBeVisible({ timeout: 10_000 });

    // TaskDetail aç
    await page.getByText(originalTitle).first().click();
    await expect(page.getByText('Düzenle')).toBeVisible({ timeout: 6_000 });

    // Düzenle butonuna tıkla
    await page.getByText('Düzenle').click();

    // Edit form açılır
    await expect(page.getByText('Görevi Düzenle')).toBeVisible({ timeout: 6_000 });
    await expect(page.getByPlaceholder('Görev başlığı')).toHaveValue(originalTitle);

    // Başlığı güncelle
    await page.getByPlaceholder('Görev başlığı').clear();
    await page.getByPlaceholder('Görev başlığı').fill(updatedTitle);
    await page.getByText('Güncelle').click();

    // TaskDetail otomatik pop → listeye dönülür ve yenilenir
    await expect(page.getByText('Görevlerim')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(updatedTitle)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(originalTitle)).not.toBeVisible();

    // Temizlik
    await deleteTodoViaApi(page, created.id);
  });

  /**
   * SENARYO 6 — FAB navigation
   * FAB'a tıklayınca yeni görev formu açılır.
   */
  test('FAB tıklama yeni görev formunu açar', async ({ page }) => {
    await page.getByRole('button', { name: 'Yeni görev ekle' }).click();

    // Header başlığı
    await expect(page.getByText('Yeni Görev')).toBeVisible({ timeout: 6_000 });

    // Form elemanları
    await expect(page.getByPlaceholder('Görev başlığı')).toBeVisible();
    await expect(page.getByPlaceholder('İsteğe bağlı açıklama')).toBeVisible();
    await expect(page.getByText('Kaydet')).toBeVisible();
    await expect(page.getByText('İptal')).toBeVisible();
  });

  /**
   * SENARYO 7 — Create flow
   * Form doldur → kaydet → listede yeni todo görünür.
   */
  test('yeni todo oluşturulur ve listede görünür', async ({ page }) => {
    const title = `Yeni Görev ${Date.now()}`;

    await page.getByRole('button', { name: 'Yeni görev ekle' }).click();
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
   * SENARYO 8 — Delete flow (API workaround)
   *
   * Alert.alert() react-native-web 0.21'de no-op olduğundan trash butonu
   * onay dialogu web'de açılmaz. Silme doğrudan API üzerinden test edilir;
   * ardından sayfa yenilenerek listenin güncellendiği doğrulanır.
   */
  test('todo silinir ve listede kaybolur', async ({ page }) => {
    const title = `Silinecek Görev ${Date.now()}`;
    const created = await createTodoViaApi(page, title);

    await page.reload();
    await expect(page.getByText('Görevlerim')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(title)).toBeVisible({ timeout: 8_000 });

    // API ile sil (Alert.alert web workaround)
    await deleteTodoViaApi(page, created.id);

    // Sayfa yenile → todo kaybolmalı
    await page.reload();
    await expect(page.getByText('Görevlerim')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(title)).not.toBeVisible({ timeout: 6_000 });
  });

  /**
   * SENARYO 9 — Form validation
   * Boş başlıkla kaydet → client-side hata mesajı, form ekranında kalır.
   */
  test('geçersiz başlıkla kayıt denemesi hata gösterir', async ({ page }) => {
    await page.getByRole('button', { name: 'Yeni görev ekle' }).click();
    await expect(page.getByText('Yeni Görev')).toBeVisible({ timeout: 6_000 });

    // Başlık boş bırak ve kaydet
    await page.getByText('Kaydet').click();

    // Client-side validasyon mesajı
    await expect(page.getByText('Başlık alanı zorunludur.')).toBeVisible();

    // Form ekranında kalmaya devam etmeli
    await expect(page.getByPlaceholder('Görev başlığı')).toBeVisible();
  });
});
