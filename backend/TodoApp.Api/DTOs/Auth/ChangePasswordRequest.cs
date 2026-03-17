using System.ComponentModel.DataAnnotations;

namespace TodoApp.Api.DTOs.Auth;

public class ChangePasswordRequest
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    [MaxLength(100)]
    public string NewPassword { get; set; } = string.Empty;
}
