namespace VendorHub.DTOs
{
    // ─── Auth ───────────────────────────────────────────────────────────────
    public record RegisterDto(string Name, string Email, string Password, string Role);
    public record LoginDto(string Email, string Password);
    public record AuthResponseDto(string Token, string Id, string Name, string Email, string Role, string Status);

    // ─── User / Admin ────────────────────────────────────────────────────────
    public record UpdatePermissionsDto(bool CanAddProducts, bool CanEditProducts, bool CanDeleteProducts);
    public record UserDto(string Id, string Name, string Email, string Role, string Status, DateTime CreatedAt);

    // ─── Product ─────────────────────────────────────────────────────────────
    public record CreateProductDto(
        string Title,
        string Description,
        decimal Price,
        string Category,
        List<string> Images,
        int AvailableUnits
    );

    public record UpdateProductDto(
        string? Title,
        string? Description,
        decimal? Price,
        string? Category,
        List<string>? Images,
        int? AvailableUnits
    );

    public record ProductDto(
        string Id,
        string VendorId,
        string VendorName,
        string Title,
        string Description,
        decimal Price,
        string Category,
        List<string> Images,
        int AvailableUnits,
        int NumberOfViewers,
        string Status,
        double AverageRating,
        int ReviewCount,
        DateTime CreatedAt
    );

    // ─── Order ───────────────────────────────────────────────────────────────
    public record CreateOrderDto(string ProductId, int Quantity);

    public record OrderDto(
        string Id,
        string CustomerId,
        string CustomerName,
        string ProductId,
        string ProductTitle,
        string VendorId,
        int Quantity,
        decimal TotalPrice,
        string Status,
        DateTime CreatedAt
    );

    // ─── Review ──────────────────────────────────────────────────────────────
    public record CreateReviewDto(string ProductId, int Rating, string Comment);
    public record ReviewDto(string Id, string CustomerId, string CustomerName, int Rating, string Comment, DateTime CreatedAt);

    // ─── Notification ────────────────────────────────────────────────────────
    public record NotificationDto(string Id, string Message, string Type, bool IsRead, string? RelatedId, DateTime CreatedAt);

    // ─── Common ──────────────────────────────────────────────────────────────
    public record ApiResponse<T>(bool Success, string Message, T? Data);
    public record PagedResult<T>(List<T> Items, int Total, int Page, int PageSize);
}
