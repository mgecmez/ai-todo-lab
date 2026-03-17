using System.ComponentModel.DataAnnotations;

namespace TodoApp.Api.DTOs.Auth;

public class ChangeEmailRequest
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string NewEmail { get; set; } = string.Empty;
}
