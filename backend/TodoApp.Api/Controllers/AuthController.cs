using Microsoft.AspNetCore.Mvc;
using TodoApp.Api.DTOs.Auth;
using TodoApp.Api.Exceptions;
using TodoApp.Api.Services;

namespace TodoApp.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IUserService userService) : ControllerBase
{
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

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var response = await userService.LoginAsync(request);
        return response is null ? Unauthorized() : Ok(response);
    }
}
