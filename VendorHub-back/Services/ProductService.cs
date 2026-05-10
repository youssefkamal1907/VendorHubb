using MongoDB.Driver;
using VendorHub.DTOs;
using VendorHub.Helpers;
using VendorHub.Models;

namespace VendorHub.Services
{
    public class ProductService
    {
        private readonly MongoDbContext _db;

        public ProductService(MongoDbContext db)
        {
            _db = db;
        }

        // ─── Vendor: Create Product ───────────────────────────────────────────
        public async Task<ApiResponse<ProductDto>> CreateAsync(string vendorId, string vendorName, CreateProductDto dto)
        {
            // Check vendor permissions
            var vendor = await _db.Users.Find(u => u.Id == vendorId).FirstOrDefaultAsync();
            if (vendor == null || !vendor.Permissions.CanAddProducts)
                return new ApiResponse<ProductDto>(false, "You don't have permission to add products", null);

            var product = new Product
            {
                VendorId = vendorId,
                VendorName = vendorName,
                Title = dto.Title,
                Description = dto.Description,
                Price = dto.Price,
                Category = dto.Category,
                Images = dto.Images,
                AvailableUnits = dto.AvailableUnits,
                Status = "Pending"
            };

            await _db.Products.InsertOneAsync(product);
            return new ApiResponse<ProductDto>(true, "Product submitted for review", MapToDto(product));
        }

        // ─── Vendor: Update Product ───────────────────────────────────────────
        public async Task<ApiResponse<ProductDto>> UpdateAsync(string productId, string vendorId, UpdateProductDto dto)
        {
            var vendor = await _db.Users.Find(u => u.Id == vendorId).FirstOrDefaultAsync();
            if (vendor == null || !vendor.Permissions.CanEditProducts)
                return new ApiResponse<ProductDto>(false, "You don't have permission to edit products", null);

            var product = await _db.Products.Find(p => p.Id == productId && p.VendorId == vendorId).FirstOrDefaultAsync();
            if (product == null)
                return new ApiResponse<ProductDto>(false, "Product not found", null);

            var update = Builders<Product>.Update
                .Set(p => p.UpdatedAt, DateTime.UtcNow);

            if (dto.Title != null) update = update.Set(p => p.Title, dto.Title);
            if (dto.Description != null) update = update.Set(p => p.Description, dto.Description);
            if (dto.Price.HasValue) update = update.Set(p => p.Price, dto.Price.Value);
            if (dto.Category != null) update = update.Set(p => p.Category, dto.Category);
            if (dto.Images != null) update = update.Set(p => p.Images, dto.Images);
            if (dto.AvailableUnits.HasValue) update = update.Set(p => p.AvailableUnits, dto.AvailableUnits.Value);

            await _db.Products.UpdateOneAsync(p => p.Id == productId, update);
            product = await _db.Products.Find(p => p.Id == productId).FirstOrDefaultAsync();
            return new ApiResponse<ProductDto>(true, "Product updated", MapToDto(product!));
        }

        // ─── Vendor: Delete Product ───────────────────────────────────────────
        public async Task<ApiResponse<object>> DeleteAsync(string productId, string vendorId)
        {
            var vendor = await _db.Users.Find(u => u.Id == vendorId).FirstOrDefaultAsync();
            if (vendor == null || !vendor.Permissions.CanDeleteProducts)
                return new ApiResponse<object>(false, "You don't have permission to delete products", null);

            var result = await _db.Products.DeleteOneAsync(p => p.Id == productId && p.VendorId == vendorId);
            if (result.DeletedCount == 0)
                return new ApiResponse<object>(false, "Product not found", null);

            return new ApiResponse<object>(true, "Product deleted", null);
        }

        // ─── Vendor: Get own products ─────────────────────────────────────────
        public async Task<ApiResponse<List<ProductDto>>> GetVendorProductsAsync(string vendorId)
        {
            var products = await _db.Products.Find(p => p.VendorId == vendorId).ToListAsync();
            return new ApiResponse<List<ProductDto>>(true, "OK", products.Select(MapToDto).ToList());
        }

        // ─── Customer / Public: Browse approved products ──────────────────────
        public async Task<ApiResponse<PagedResult<ProductDto>>> BrowseAsync(
            string? category, string? search, decimal? minPrice, decimal? maxPrice,
            int page = 1, int pageSize = 12)
        {
            var filter = Builders<Product>.Filter.Eq(p => p.Status, "Approved");

            if (!string.IsNullOrEmpty(category))
                filter &= Builders<Product>.Filter.Eq(p => p.Category, category);

            if (!string.IsNullOrEmpty(search))
                filter &= Builders<Product>.Filter.Regex(p => p.Title, new MongoDB.Bson.BsonRegularExpression(search, "i"));

            if (minPrice.HasValue)
                filter &= Builders<Product>.Filter.Gte(p => p.Price, minPrice.Value);

            if (maxPrice.HasValue)
                filter &= Builders<Product>.Filter.Lte(p => p.Price, maxPrice.Value);

            var total = await _db.Products.CountDocumentsAsync(filter);
            var products = await _db.Products.Find(filter)
                .Skip((page - 1) * pageSize)
                .Limit(pageSize)
                .ToListAsync();

            var result = new PagedResult<ProductDto>(products.Select(MapToDto).ToList(), (int)total, page, pageSize);
            return new ApiResponse<PagedResult<ProductDto>>(true, "OK", result);
        }

        // ─── Get single approved product (optional view increment — e.g. false on duplicate client fetches) ─────
        public async Task<ApiResponse<ProductDto>> GetByIdAsync(string productId, bool recordView = true)
        {
            var product = await _db.Products.Find(p => p.Id == productId).FirstOrDefaultAsync();
            if (product == null || product.Status != "Approved")
                return new ApiResponse<ProductDto>(false, "Product not found", null);

            if (recordView)
            {
                await _db.Products.UpdateOneAsync(
                    p => p.Id == productId,
                    Builders<Product>.Update.Inc(p => p.NumberOfViewers, 1));
                product.NumberOfViewers++;
            }

            return new ApiResponse<ProductDto>(true, "OK", MapToDto(product));
        }

        // ─── Admin: Get pending products ──────────────────────────────────────
        public async Task<ApiResponse<List<ProductDto>>> GetPendingAsync()
        {
            var products = await _db.Products.Find(p => p.Status == "Pending").ToListAsync();
            return new ApiResponse<List<ProductDto>>(true, "OK", products.Select(MapToDto).ToList());
        }

        // ─── Admin: Approve / Reject product ─────────────────────────────────
        public async Task<ApiResponse<ProductDto>> ReviewProductAsync(string productId, string status)
        {
            var product = await _db.Products.Find(p => p.Id == productId).FirstOrDefaultAsync();
            if (product == null)
                return new ApiResponse<ProductDto>(false, "Product not found", null);

            await _db.Products.UpdateOneAsync(
                p => p.Id == productId,
                Builders<Product>.Update.Set(p => p.Status, status));

            product.Status = status;
            return new ApiResponse<ProductDto>(true, $"Product {status}", MapToDto(product));
        }

        // ─── Vendor: Sales stats ──────────────────────────────────────────────
        public async Task<ApiResponse<object>> GetSalesStatsAsync(string vendorId)
        {
            var orders = await _db.Orders.Find(o => o.VendorId == vendorId).ToListAsync();
            var products = await _db.Products.Find(p => p.VendorId == vendorId).ToListAsync();

            var stats = new
            {
                TotalOrders = orders.Count,
                TotalRevenue = orders.Sum(o => o.TotalPrice),
                TotalProducts = products.Count,
                ApprovedProducts = products.Count(p => p.Status == "Approved"),
                PendingProducts = products.Count(p => p.Status == "Pending"),
                TopProducts = orders
                    .GroupBy(o => o.ProductId)
                    .Select(g => new { ProductId = g.Key, ProductTitle = g.First().ProductTitle, Sales = g.Sum(o => o.Quantity) })
                    .OrderByDescending(x => x.Sales)
                    .Take(5)
                    .ToList(),
                ProductPerformance = products
                    .Select(p =>
                    {
                        var forProduct = orders.Where(o => o.ProductId == p.Id).ToList();
                        return new
                        {
                            ProductId = p.Id,
                            ProductTitle = p.Title,
                            Status = p.Status,
                            Views = p.NumberOfViewers,
                            UnitsSold = forProduct.Sum(o => o.Quantity),
                            Revenue = forProduct.Sum(o => o.TotalPrice),
                            AverageRating = p.AverageRating,
                            ReviewCount = p.ReviewCount
                        };
                    })
                    .OrderByDescending(x => x.Revenue)
                    .ThenByDescending(x => x.Views)
                    .ToList()
            };

            return new ApiResponse<object>(true, "OK", stats);
        }

        private static ProductDto MapToDto(Product p) => new(
            p.Id, p.VendorId, p.VendorName, p.Title, p.Description,
            p.Price, p.Category, p.Images, p.AvailableUnits,
            p.NumberOfViewers, p.Status, p.AverageRating, p.ReviewCount, p.CreatedAt
        );
    }
}
