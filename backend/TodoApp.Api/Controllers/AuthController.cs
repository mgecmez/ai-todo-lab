using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using TodoApp.Api.DTOs.Auth;
using TodoApp.Api.Exceptions;
using TodoApp.Api.Services;

namespace TodoApp.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IUserService userService) : ControllerBase
{
    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        try
        {
            var response = await userService.RegisterAsync(request);
            return CreatedAtAction(nameof(Register), response);
        }
        catch (UserAlreadyExistsException)
        {
            return Conflict(new { message = "Bu e-posta adresi zaten kayıtlı." });
        }
    }

    [EnableRateLimiting("login")]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var response = await userService.LoginAsync(request);
        return response is null ? Unauthorized() : Ok(response);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetProfile()
    {
        var profile = await userService.GetProfileAsync(CurrentUserId);
        if (profile == null) return NotFound();
        return Ok(profile);
    }

    [Authorize]
    [HttpPut("email")]
    public async Task<IActionResult> ChangeEmail([FromBody] ChangeEmailRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        try
        {
            var updated = await userService.ChangeEmailAsync(CurrentUserId, request);
            return Ok(updated);
        }
        catch (WrongPasswordException)
        {
            return Unauthorized(new { status = 401, message = "Mevcut şifreniz hatalı.", errors = new { } });
        }
        catch (SameEmailException)
        {
            return BadRequest(new { status = 400, message = "Yeni e-posta adresiniz mevcut adresinizle aynı.", errors = new { } });
        }
        catch (UserAlreadyExistsException)
        {
            return Conflict(new { status = 409, message = "Bu e-posta adresi zaten kullanımda.", errors = new { } });
        }
    }

    [Authorize]
    [HttpPut("password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        try
        {
            await userService.ChangePasswordAsync(CurrentUserId, request);
            return Ok(new { message = "Şifre başarıyla güncellendi." });
        }
        catch (WrongPasswordException)
        {
            return Unauthorized(new { status = 401, message = "Mevcut şifreniz hatalı.", errors = new { } });
        }
        catch (SamePasswordException)
        {
            return BadRequest(new { status = 400, message = "Yeni şifreniz mevcut şifrenizle aynı olamaz.", errors = new { } });
        }
    }

    [Authorize]
    [HttpDelete("account")]
    public async Task<IActionResult> DeleteAccount([FromBody] DeleteAccountRequest request)
    {
        try
        {
            await userService.DeleteAccountAsync(CurrentUserId, request);
            return NoContent();
        }
        catch (WrongPasswordException)
        {
            return Unauthorized(new { status = 401, message = "Şifreniz hatalı.", errors = new { } });
        }
    }
}
