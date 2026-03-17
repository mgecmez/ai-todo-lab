using TodoApp.Api.DTOs;
using TodoApp.Api.Models;

namespace TodoApp.Api.Services;

/// <summary>
/// Todo iş mantığı katmanının soyut arayüzü.
/// Controller bu arayüze bağımlıdır; somut implementasyon DI tarafından enjekte edilir.
///
/// Katman sınır kuralı:
///   - Service (bu arayüzün implementasyonu): Id üretimi, zaman damgası atama,
///     alan varsayılanları (IsCompleted, IsPinned), alan trim işlemleri, DTO → entity dönüşümü.
///   - Repository: saf veri erişimi — Id/timestamp/default logic içermez.
/// </summary>
public interface ITodoService
{
    /// <summary>Kullanıcıya ait tüm todo'ları sıralanmış biçimde döndürür.</summary>
    IReadOnlyList<Todo> GetAll(string userId);

    /// <summary>
    /// Verilen id ve userId'ye sahip todo'yu döndürür.
    /// Bulunamazsa null döner.
    /// </summary>
    Todo? GetById(Guid id, string userId);

    /// <summary>
    /// Yeni bir todo oluşturur.
    /// Id, CreatedAt, UpdatedAt ve varsayılan alan değerlerini bu katman atar.
    /// </summary>
    Todo Create(CreateTodoRequest request, string userId);

    /// <summary>
    /// Var olan bir todo'yu günceller.
    /// Todo bulunamazsa null döner.
    /// </summary>
    Todo? Update(Guid id, UpdateTodoRequest request, string userId);

    /// <summary>
    /// Verilen id ve userId'ye sahip todo'yu siler.
    /// Başarılıysa true, bulunamazsa false döner.
    /// </summary>
    bool Delete(Guid id, string userId);

    /// <summary>
    /// Todo'nun IsCompleted değerini tersine çevirir.
    /// Todo bulunamazsa null döner.
    /// </summary>
    Todo? ToggleComplete(Guid id, string userId);

    /// <summary>
    /// Todo'nun IsPinned değerini tersine çevirir.
    /// Todo bulunamazsa null döner.
    /// </summary>
    Todo? TogglePin(Guid id, string userId);
}
