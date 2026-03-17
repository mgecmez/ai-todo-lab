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
