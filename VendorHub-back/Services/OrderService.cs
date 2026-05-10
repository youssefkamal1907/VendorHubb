using Microsoft.AspNetCore.SignalR;
using MongoDB.Driver;
using VendorHub.DTOs;
using VendorHub.Helpers;
using VendorHub.Hubs;
using VendorHub.Models;

namespace VendorHub.Services
{
    public class OrderService
    {
        private readonly MongoDbContext _db;
        private readonly IHubContext<NotificationHub> _hub;

        public OrderService(MongoDbContext db, IHubContext<NotificationHub> hub)
        {
            _db = db;
            _hub = hub;
        }

        public async Task<ApiResponse<OrderDto>> CreateOrderAsync(string customerId, string customerName, CreateOrderDto dto)
        {
            var product = await _db.Products.Find(p => p.Id == dto.ProductId && p.Status == "Approved").FirstOrDefaultAsync();
            if (product == null)
                return new ApiResponse<OrderDto>(false, "Product not found or not approved", null);

            if (product.AvailableUnits < dto.Quantity)
                return new ApiResponse<OrderDto>(false, "Not enough stock available", null);

            var order = new Order
            {
                CustomerId = customerId,
                CustomerName = customerName,
                ProductId = dto.ProductId,
                ProductTitle = product.Title,
                VendorId = product.VendorId,
                Quantity = dto.Quantity,
                TotalPrice = product.Price * dto.Quantity,
                Status = "Confirmed"
            };

            await _db.Orders.InsertOneAsync(order);

            // Deduct stock
            await _db.Products.UpdateOneAsync(
                p => p.Id == dto.ProductId,
                Builders<Product>.Update.Inc(p => p.AvailableUnits, -dto.Quantity));

            // ─── Real-time notification to vendor ─────────────────────────────
            var notification = new Notification
            {
                UserId = product.VendorId,
                Message = $"{customerName} purchased {dto.Quantity}x \"{product.Title}\"",
                Type = "NewOrder",
                RelatedId = order.Id
            };
            await _db.Notifications.InsertOneAsync(notification);

            // Push via SignalR to the vendor's group
            await _hub.Clients.Group(product.VendorId).SendAsync("ReceiveNotification", new
            {
                notification.Id,
                notification.Message,
                notification.Type,
                notification.RelatedId,
                notification.CreatedAt
            });

            return new ApiResponse<OrderDto>(true, "Order placed successfully", MapToDto(order));
        }

        public async Task<ApiResponse<List<OrderDto>>> GetCustomerOrdersAsync(string customerId)
        {
            var orders = await _db.Orders.Find(o => o.CustomerId == customerId)
                .SortByDescending(o => o.CreatedAt).ToListAsync();
            return new ApiResponse<List<OrderDto>>(true, "OK", orders.Select(MapToDto).ToList());
        }

        public async Task<ApiResponse<List<OrderDto>>> GetVendorOrdersAsync(string vendorId)
        {
            var orders = await _db.Orders.Find(o => o.VendorId == vendorId)
                .SortByDescending(o => o.CreatedAt).ToListAsync();
            return new ApiResponse<List<OrderDto>>(true, "OK", orders.Select(MapToDto).ToList());
        }

        private static OrderDto MapToDto(Order o) => new(
            o.Id, o.CustomerId, o.CustomerName, o.ProductId,
            o.ProductTitle, o.VendorId, o.Quantity, o.TotalPrice, o.Status, o.CreatedAt
        );
    }
}
