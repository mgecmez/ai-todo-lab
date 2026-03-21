using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace TodoApp.Api.Tests;

/// <summary>
/// Refresh token rotasyonu ve logout/revoke davranışlarını doğrulayan entegrasyon testleri.
/// Her test kendi izole kullanıcısını oluşturur; paylaşılan fabrika nedeniyle InMemory DB
/// testler arasında sıfırlanmaz, bu yüzden benzersiz e-posta adresleri kullanılır.
/// </summary>
public class RefreshTokenTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public RefreshTokenTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    // ── Yardımcı metot ────────────────────────────────────────────────────────

    /// <summary>
    /// Yeni bir kullanıcı register + login yaparak accessToken, refreshToken ve
    /// anonim HttpClient döndürür.
    /// </summary>
    private async Task<(HttpClient anonClient, string accessToken, string refreshToken)>
        RegisterAndLoginAsync()
    {
        var suffix   = Guid.NewGuid().ToString("N")[..8];
        var email    = $"refresh-{suffix}@test.com";
        var password = "Password123!";

        var client = _factory.CreateClient();

        var registerResp = await client.PostAsJsonAsync("/api/auth/register", new { email, password });
        Assert.Equal(HttpStatusCode.Created, registerResp.StatusCode);

        var loginResp = await client.PostAsJsonAsync("/api/auth/login", new { email, password });
        Assert.Equal(HttpStatusCode.OK, loginResp.StatusCode);

        var body         = await loginResp.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var accessToken  = body.GetProperty("accessToken").GetString()!;
        var refreshToken = body.GetProperty("refreshToken").GetString()!;

        return (client, accessToken, refreshToken);
    }

    // ── Test senaryoları ──────────────────────────────────────────────────────

    // RT-001 — Geçerli refresh token ile yeni token çifti alınabilir
    [Fact]
    public async Task Refresh_WithValidToken_Returns200AndNewTokens()
    {
        var (client, _, refreshToken) = await RegisterAndLoginAsync();

        var response = await client.PostAsJsonAsync("/api/auth/refresh",
            new { refreshToken });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body            = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var newAccessToken  = body.GetProperty("accessToken").GetString();
        var newRefreshToken = body.GetProperty("refreshToken").GetString();

        Assert.False(string.IsNullOrEmpty(newAccessToken),  "Yeni accessToken boş olmamalı.");
        Assert.False(string.IsNullOrEmpty(newRefreshToken), "Yeni refreshToken boş olmamalı.");
    }

    // RT-002 — Tek kullanımlık token (rotation): kullanılmış token ikinci kez reddedilir
    [Fact]
    public async Task Refresh_WithUsedToken_Returns401()
    {
        var (client, _, originalRefreshToken) = await RegisterAndLoginAsync();

        // İlk refresh — başarılı olmalı
        var firstRefreshResp = await client.PostAsJsonAsync("/api/auth/refresh",
            new { refreshToken = originalRefreshToken });
        Assert.Equal(HttpStatusCode.OK, firstRefreshResp.StatusCode);

        // Aynı (artık kullanılmış) token ile ikinci refresh denemesi → 401
        var secondRefreshResp = await client.PostAsJsonAsync("/api/auth/refresh",
            new { refreshToken = originalRefreshToken });

        Assert.Equal(HttpStatusCode.Unauthorized, secondRefreshResp.StatusCode);
    }

    // RT-003 — Süresi dolmuş token testi (zaman sağlayıcı soyutlaması gerekli)
    [Fact(Skip = "Requires time provider abstraction to advance token expiry")]
    public async Task Refresh_WithExpiredToken_Returns401()
    {
        // Bu test, ITimeProvider veya benzeri bir soyutlama ile tokenın
        // süresinin dolmuş görünmesi sağlandığında implemente edilmelidir.
        await Task.CompletedTask;
    }

    // RT-004 — Logout sonrası aynı refresh token geçersiz sayılır
    [Fact]
    public async Task Logout_RevokesRefreshToken()
    {
        var (client, accessToken, refreshToken) = await RegisterAndLoginAsync();

        // Authorization header'ı ayarla (Logout [Authorize] gerektiriyor)
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", accessToken);

        // Logout — refresh token'ı iptal et
        var logoutResp = await client.PostAsJsonAsync("/api/auth/logout",
            new { refreshToken });
        Assert.Equal(HttpStatusCode.NoContent, logoutResp.StatusCode);

        // Authorization header'ı kaldır (refresh endpoint'i auth gerektirmiyor)
        client.DefaultRequestHeaders.Authorization = null;

        // İptal edilmiş token ile refresh denemesi → 401
        var refreshAfterLogout = await client.PostAsJsonAsync("/api/auth/refresh",
            new { refreshToken });

        Assert.Equal(HttpStatusCode.Unauthorized, refreshAfterLogout.StatusCode);
    }

    // RT-005 — Rastgele/geçersiz bir string ile refresh denemesi → 401
    [Fact]
    public async Task Refresh_WithInvalidToken_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/refresh",
            new { refreshToken = "this-is-not-a-valid-refresh-token-garbage-xyz-12345" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
