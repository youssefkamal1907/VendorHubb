using MongoDB.Driver;
using VendorHub.DTOs;
using VendorHub.Helpers;
using VendorHub.Models;

namespace VendorHub.Services
{
    public class ReviewService
    {
        private readonly MongoDbContext _db;

        public ReviewService(MongoDbContext db) => _db = db;

        public async Task<ApiResponse<ReviewDto>> AddReviewAsync(string customerId, string customerName, CreateReviewDto dto)
        {
            // Customer must have purchased the product
            var hasPurchased = await _db.Orders.Find(o => o.CustomerId == customerId && o.ProductId == dto.ProductId).AnyAsync();
            if (!hasPurchased)
                return new ApiResponse<ReviewDto>(false, "You can only review products you have purchased", null);

            // One review per product
            var existing = await _db.Reviews.Find(r => r.CustomerId == customerId && r.ProductId == dto.ProductId).AnyAsync();
            if (existing)
                return new ApiResponse<ReviewDto>(false, "You have already reviewed this product", null);

            var review = new Review
            {
                ProductId = dto.ProductId,
                CustomerId = customerId,
                CustomerName = customerName,
                Rating = dto.Rating,
                Comment = dto.Comment
            };
            await _db.Reviews.InsertOneAsync(review);

            // Recalculate product rating
            var reviews = await _db.Reviews.Find(r => r.ProductId == dto.ProductId).ToListAsync();
            var avg = reviews.Average(r => r.Rating);

            await _db.Products.UpdateOneAsync(
                p => p.Id == dto.ProductId,
                Builders<Product>.Update
                    .Set(p => p.AverageRating, avg)
                    .Set(p => p.ReviewCount, reviews.Count));

            return new ApiResponse<ReviewDto>(true, "Review added", MapToDto(review));
        }

        public async Task<ApiResponse<List<ReviewDto>>> GetProductReviewsAsync(string productId)
        {
            var reviews = await _db.Reviews.Find(r => r.ProductId == productId)
                .SortByDescending(r => r.CreatedAt).ToListAsync();
            return new ApiResponse<List<ReviewDto>>(true, "OK", reviews.Select(MapToDto).ToList());
        }

        private static ReviewDto MapToDto(Review r) =>
            new(r.Id, r.CustomerId, r.CustomerName, r.Rating, r.Comment, r.CreatedAt);
    }

    public class FavoriteService
    {
        private readonly MongoDbContext _db;

        public FavoriteService(MongoDbContext db) => _db = db;

        public async Task<ApiResponse<object>> ToggleFavoriteAsync(string customerId, string productId)
        {
            var existing = await _db.Favorites.Find(f => f.CustomerId == customerId && f.ProductId == productId).FirstOrDefaultAsync();

            if (existing != null)
            {
                await _db.Favorites.DeleteOneAsync(f => f.Id == existing.Id);
                return new ApiResponse<object>(true, "Removed from favorites", null);
            }

            await _db.Favorites.InsertOneAsync(new Favorite { CustomerId = customerId, ProductId = productId });
            return new ApiResponse<object>(true, "Added to favorites", null);
        }

        public async Task<ApiResponse<List<ProductDto>>> GetFavoritesAsync(string customerId)
        {
            var favs = await _db.Favorites.Find(f => f.CustomerId == customerId).ToListAsync();
            var productIds = favs.Select(f => f.ProductId).ToList();

            var products = await _db.Products
                .Find(p => productIds.Contains(p.Id) && p.Status == "Approved")
                .ToListAsync();

            return new ApiResponse<List<ProductDto>>(true, "OK",
                products.Select(p => new ProductDto(
                    p.Id, p.VendorId, p.VendorName, p.Title, p.Description,
                    p.Price, p.Category, p.Images, p.AvailableUnits,
                    p.NumberOfViewers, p.Status, p.AverageRating, p.ReviewCount, p.CreatedAt
                )).ToList());
        }
    }

    public class NotificationService
    {
        private readonly MongoDbContext _db;

        public NotificationService(MongoDbContext db) => _db = db;

        public async Task<ApiResponse<List<NotificationDto>>> GetUserNotificationsAsync(string userId)
        {
            var notifs = await _db.Notifications.Find(n => n.UserId == userId)
                .SortByDescending(n => n.CreatedAt).ToListAsync();

            return new ApiResponse<List<NotificationDto>>(true, "OK",
                notifs.Select(n => new NotificationDto(n.Id, n.Message, n.Type, n.IsRead, n.RelatedId, n.CreatedAt)).ToList());
        }

        public async Task<ApiResponse<object>> MarkAllReadAsync(string userId)
        {
            await _db.Notifications.UpdateManyAsync(
                n => n.UserId == userId && !n.IsRead,
                Builders<Notification>.Update.Set(n => n.IsRead, true));

            return new ApiResponse<object>(true, "All notifications marked as read", null);
        }
    }
}
