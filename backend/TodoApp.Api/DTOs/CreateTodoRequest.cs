using System.ComponentModel.DataAnnotations;
using TodoApp.Api.Models;
using TodoApp.Api.Validation;

namespace TodoApp.Api.DTOs;

public class CreateTodoRequest
{
    [Required(ErrorMessage = "Title alanı zorunludur.")]
    [NotWhitespace]
    [MaxLength(200, ErrorMessage = "Title en fazla 200 karakter olabilir.")]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1000, ErrorMessage = "Description en fazla 1000 karakter olabilir.")]
    public string? Description { get; set; }

    // Belirtilmezse controller TodoPriority.Normal kullanır.
    [Range(0, 3, ErrorMessage = "Priority 0 (Low) ile 3 (Urgent) arasında olmalıdır.")]
    public int? Priority { get; set; }

    // Nullable; kullanıcı son tarih belirtmek zorunda değil.
    public DateTime? DueDate { get; set; }

    // Belirtilmezse false; oluşturma anında pin mevcut değil.
    public bool? IsPinned { get; set; }

    // Virgülle ayrılmış etiketler; örn. "iş,kişisel".
    [MaxLength(500, ErrorMessage = "Tags en fazla 500 karakter olabilir.")]
    public string? Tags { get; set; }
}
