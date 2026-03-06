using System.ComponentModel.DataAnnotations;
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
}
