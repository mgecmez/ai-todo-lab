using System.ComponentModel.DataAnnotations;

namespace TodoApp.Api.DTOs.Auth;

public class DeleteAccountRequest
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;
}
