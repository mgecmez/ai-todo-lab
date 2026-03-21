using TodoApp.Api.DTOs.Auth;

namespace TodoApp.Api.Services;

public interface IUserService
{
    /// <summary>
    /// Yeni kullanıcı kaydeder ve access + refresh token döner.
    /// Email zaten kayıtlıysa UserAlreadyExistsException fırlatır.
    /// </summary>
    Task<AuthResponse> RegisterAsync(RegisterRequest request);

    /// <summary>
    /// Email ve şifre doğrulaması yapar, başarılıysa access + refresh token döner.
    /// Başarısızlıkta null döner.
    /// </summary>
    Task<AuthResponse?> LoginAsync(LoginRequest request);

    /// <summary>
    /// Geçerli bir refresh token ile yeni access + refresh token çifti döner.
    /// Token geçersiz veya süresi dolmuşsa null döner.
    /// </summary>
    Task<AuthResponse?> RefreshAsync(string rawRefreshToken);

    /// <summary>
    /// Refresh token'ı iptal eder. Zaten iptal edilmişse işlem yapılmaz (idempotent).
    /// </summary>
    Task RevokeRefreshTokenAsync(string rawRefreshToken);

    Task<UserProfileResponse?> GetProfileAsync(string userId);
    Task<UserProfileResponse> ChangeEmailAsync(string userId, ChangeEmailRequest request);
    Task ChangePasswordAsync(string userId, ChangePasswordRequest request);
    Task DeleteAccountAsync(string userId, DeleteAccountRequest request);
}
