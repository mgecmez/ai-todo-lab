using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using TodoApp.Api.DTOs.Auth;
using TodoApp.Api.Exceptions;
using TodoApp.Api.Models;
using TodoApp.Api.Repositories;

namespace TodoApp.Api.Services;

public class UserService(
    IUserRepository userRepository,
    IPasswordHasher<User> passwordHasher,
    IConfiguration configuration) : IUserService
{
    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        var email = request.Email.ToLowerInvariant();

        var existing = await userRepository.GetByEmailAsync(email);
        if (existing is not null)
            throw new UserAlreadyExistsException(email);

        var user = new User
        {
            Id        = Guid.NewGuid(),
            Email     = email,
            CreatedAt = DateTime.UtcNow,
        };
        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);

        var saved = await userRepository.AddAsync(user);

        return new AuthResponse
        {
            Token  = GenerateJwt(saved),
            UserId = saved.Id.ToString(),
            Email  = saved.Email,
        };
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest request)
    {
        var email = request.Email.ToLowerInvariant();

        var user = await userRepository.GetByEmailAsync(email);
        if (user is null) return null;

        var result = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (result == PasswordVerificationResult.Failed) return null;

        return new AuthResponse
        {
            Token  = GenerateJwt(user),
            UserId = user.Id.ToString(),
            Email  = user.Email,
        };
    }

    public async Task<UserProfileResponse?> GetProfileAsync(string userId)
    {
        var user = await userRepository.GetByIdAsync(Guid.Parse(userId));
        if (user is null) return null;

        return new UserProfileResponse
        {
            UserId    = user.Id.ToString(),
            Email     = user.Email,
            CreatedAt = user.CreatedAt,
        };
    }

    public async Task<UserProfileResponse> ChangeEmailAsync(string userId, ChangeEmailRequest request)
    {
        var user = await userRepository.GetByIdAsync(Guid.Parse(userId));

        var verifyResult = passwordHasher.VerifyHashedPassword(user!, user!.PasswordHash, request.CurrentPassword);
        if (verifyResult == PasswordVerificationResult.Failed)
            throw new WrongPasswordException();

        if (request.NewEmail.ToLowerInvariant() == user.Email.ToLowerInvariant())
            throw new SameEmailException();

        var existing = await userRepository.GetByEmailAsync(request.NewEmail);
        if (existing is not null)
            throw new UserAlreadyExistsException(request.NewEmail);

        user.Email = request.NewEmail.ToLowerInvariant();

        var updated = await userRepository.UpdateAsync(user);

        return new UserProfileResponse
        {
            UserId    = updated.Id.ToString(),
            Email     = updated.Email,
            CreatedAt = updated.CreatedAt,
        };
    }

    public async Task ChangePasswordAsync(string userId, ChangePasswordRequest request)
    {
        var user = await userRepository.GetByIdAsync(Guid.Parse(userId));

        var verifyCurrentResult = passwordHasher.VerifyHashedPassword(user!, user!.PasswordHash, request.CurrentPassword);
        if (verifyCurrentResult == PasswordVerificationResult.Failed)
            throw new WrongPasswordException();

        var verifyNewResult = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.NewPassword);
        if (verifyNewResult == PasswordVerificationResult.Success)
            throw new SamePasswordException();

        user.PasswordHash = passwordHasher.HashPassword(user, request.NewPassword);

        await userRepository.UpdateAsync(user);
    }

    public async Task DeleteAccountAsync(string userId, DeleteAccountRequest request)
    {
        var user = await userRepository.GetByIdAsync(Guid.Parse(userId));

        var verifyResult = passwordHasher.VerifyHashedPassword(user!, user!.PasswordHash, request.CurrentPassword);
        if (verifyResult == PasswordVerificationResult.Failed)
            throw new WrongPasswordException();

        await userRepository.DeleteAsync(Guid.Parse(userId));
    }

    private string GenerateJwt(User user)
    {
        var secret   = configuration["Jwt:Secret"]!;
        var issuer   = configuration["Jwt:Issuer"]!;
        var audience = configuration["Jwt:Audience"]!;
        var expDays  = int.Parse(configuration["Jwt:ExpiryDays"] ?? "7");

        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub,   user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
        };

        var token = new JwtSecurityToken(
            issuer:             issuer,
            audience:           audience,
            claims:             claims,
            expires:            DateTime.UtcNow.AddDays(expDays),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
