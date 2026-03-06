using System.ComponentModel.DataAnnotations;

namespace TodoApp.Api.Validation;

[AttributeUsage(AttributeTargets.Property)]
public class NotWhitespaceAttribute : ValidationAttribute
{
    public NotWhitespaceAttribute()
        : base("'{0}' alanı boş veya yalnızca boşluk karakteri içeremez.") { }

    protected override ValidationResult? IsValid(object? value, ValidationContext ctx)
    {
        if (value is string str && string.IsNullOrWhiteSpace(str))
            return new ValidationResult(FormatErrorMessage(ctx.DisplayName));

        return ValidationResult.Success;
    }
}
