namespace TodoApp.Api.Models;

public class RefreshToken
{
    public Guid Id { get; set; }

    /// <summary>SHA-256 hex digest of the raw token — never stored as plain text.</summary>
    public string TokenHash { get; set; } = string.Empty;

    public Guid UserId { get; set; }

    public DateTime ExpiresAt { get; set; }

    public DateTime? RevokedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    // ── Navigation ────────────────────────────────────────────────────────────

    public User User { get; set; } = null!;

    // ── Computed ──────────────────────────────────────────────────────────────

    public bool IsActive => RevokedAt is null && ExpiresAt > DateTime.UtcNow;
}
