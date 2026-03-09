using System.ComponentModel.DataAnnotations;
using TodoApp.Api.Models;
using TodoApp.Api.Validation;

namespace TodoApp.Api.DTOs;

public class UpdateTodoRequest
{
    [Required(ErrorMessage = "Title alanı zorunludur.")]
    [NotWhitespace]
    [MaxLength(200, ErrorMessage = "Title en fazla 200 karakter olabilir.")]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1000, ErrorMessage = "Description en fazla 1000 karakter olabilir.")]
    public string? Description { get; set; }

    public bool IsCompleted { get; set; }

    // Güncelleme sırasında mevcut değer gönderilmezse Normal (1) varsayılanı uygulanır.
    [Range(0, 3, ErrorMessage = "Priority 0 (Low) ile 3 (Urgent) arasında olmalıdır.")]
    public int Priority { get; set; } = (int)TodoPriority.Normal;

    // Nullable; null gönderilerek mevcut son tarih temizlenebilir.
    public DateTime? DueDate { get; set; }

    public bool IsPinned { get; set; }

    // Virgülle ayrılmış etiketler; null gönderilerek temizlenebilir.
    [MaxLength(500, ErrorMessage = "Tags en fazla 500 karakter olabilir.")]
    public string? Tags { get; set; }
}
