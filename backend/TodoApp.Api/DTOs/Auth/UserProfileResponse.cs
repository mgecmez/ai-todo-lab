namespace TodoApp.Api.DTOs.Auth;

public class UserProfileResponse
{
    public string   UserId    { get; set; } = string.Empty;
    public string   Email     { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
