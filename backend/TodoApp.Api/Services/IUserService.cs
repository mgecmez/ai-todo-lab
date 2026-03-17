using TodoApp.Api.DTOs.Auth;

namespace TodoApp.Api.Services;

public interface IUserService
{
    /// <summary>
    /// Yeni kullanıcı kaydeder ve JWT token döner.
    /// Email zaten kayıtlıysa UserAlreadyExistsException fırlatır.
    /// </summary>
    Task<AuthResponse> RegisterAsync(RegisterRequest request);

    /// <summary>
    /// Email ve şifre doğrulaması yapar, başarılıysa JWT token döner.
    /// Başarısızlıkta null döner.
    /// </summary>
    Task<AuthResponse?> LoginAsync(LoginRequest request);

    Task<UserProfileResponse?> GetProfileAsync(string userId);
    Task<UserProfileResponse> ChangeEmailAsync(string userId, ChangeEmailRequest request);
    Task ChangePasswordAsync(string userId, ChangePasswordRequest request);
    Task DeleteAccountAsync(string userId, DeleteAccountRequest request);
}
