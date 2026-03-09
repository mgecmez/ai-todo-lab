namespace TodoApp.Api.Models;

/// <summary>
/// Görev öncelik seviyeleri.
/// Veritabanında integer olarak saklanır (HasConversion&lt;int&gt;).
/// </summary>
public enum TodoPriority
{
    Low    = 0,
    Normal = 1,
    High   = 2,
    Urgent = 3,
}
