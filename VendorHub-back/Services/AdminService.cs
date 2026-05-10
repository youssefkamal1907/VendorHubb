using Microsoft.AspNetCore.SignalR;
using MongoDB.Driver;
using VendorHub.DTOs;
using VendorHub.Helpers;
using VendorHub.Hubs;
using VendorHub.Models;

namespace VendorHub.Services
{
    public class AdminService
    {
        private readonly MongoDbContext _db;
        private readonly IHubContext<NotificationHub> _hub;

        public AdminService(MongoDbContext db, IHubContext<NotificationHub> hub)
        {
            _db = db;
            _hub = hub;
        }

        // ─── Get pending vendors ──────────────────────────────────────────────
        public async Task<ApiResponse<List<UserDto>>> GetPendingVendorsAsync()
        {
            var vendors = await _db.Users.Find(u => u.Role == "Vendor" && u.Status == "Pending").ToListAsync();
            return new ApiResponse<List<UserDto>>(true, "OK", vendors.Select(MapUserToDto).ToList());
        }

        // ─── Approve / Reject vendor ──────────────────────────────────────────
        public async Task<ApiResponse<UserDto>> ReviewVendorAsync(string vendorId, string status)
        {
            var vendor = await _db.Users.Find(u => u.Id == vendorId && u.Role == "Vendor").FirstOrDefaultAsync();
            if (vendor == null)
                return new ApiResponse<UserDto>(false, "Vendor not found", null);

            await _db.Users.UpdateOneAsync(
                u => u.Id == vendorId,
                Builders<User>.Update.Set(u => u.Status, status));

            vendor.Status = status;

            // Notify vendor
            var notification = new Notification
            {
                UserId = vendorId,
                Message = status == "Active"
                    ? "Your vendor account has been approved! You can now add products."
                    : "Your vendor account application was rejected.",
                Type = status == "Active" ? "VendorApproved" : "VendorRejected",
            };
            await _db.Notifications.InsertOneAsync(notification);
            await _hub.Clients.Group(vendorId).SendAsync("ReceiveNotification", new
            {
                notification.Id,
                notification.Message,
                notification.Type,
                notification.CreatedAt
            });

            return new ApiResponse<UserDto>(true, $"Vendor {status}", MapUserToDto(vendor));
        }

        // ─── Update vendor permissions ────────────────────────────────────────
        public async Task<ApiResponse<UserDto>> UpdatePermissionsAsync(string vendorId, UpdatePermissionsDto dto)
        {
            var vendor = await _db.Users.Find(u => u.Id == vendorId && u.Role == "Vendor").FirstOrDefaultAsync();
            if (vendor == null)
                return new ApiResponse<UserDto>(false, "Vendor not found", null);

            var permissions = new VendorPermissions
            {
                CanAddProducts = dto.CanAddProducts,
                CanEditProducts = dto.CanEditProducts,
                CanDeleteProducts = dto.CanDeleteProducts
            };

            await _db.Users.UpdateOneAsync(
                u => u.Id == vendorId,
                Builders<User>.Update.Set(u => u.Permissions, permissions));

            vendor.Permissions = permissions;
            return new ApiResponse<UserDto>(true, "Permissions updated", MapUserToDto(vendor));
        }

        // ─── Get all vendors ──────────────────────────────────────────────────
        public async Task<ApiResponse<List<UserDto>>> GetAllVendorsAsync()
        {
            var vendors = await _db.Users.Find(u => u.Role == "Vendor").ToListAsync();
            return new ApiResponse<List<UserDto>>(true, "OK", vendors.Select(MapUserToDto).ToList());
        }

        // ─── Admin: Approve / Reject product with notification ────────────────
        public async Task<ApiResponse<object>> ReviewProductAsync(string productId, string status, ProductService productService)
        {
            var result = await productService.ReviewProductAsync(productId, status);
            if (!result.Success || result.Data == null)
                return new ApiResponse<object>(false, result.Message, null);

            var vendorId = result.Data.VendorId;
            var notification = new Notification
            {
                UserId = vendorId,
                Message = status == "Approved"
                    ? $"Your product \"{result.Data.Title}\" has been approved and is now live!"
                    : $"Your product \"{result.Data.Title}\" was rejected.",
                Type = status == "Approved" ? "ProductApproved" : "ProductRejected",
                RelatedId = productId
            };
            await _db.Notifications.InsertOneAsync(notification);
            await _hub.Clients.Group(vendorId).SendAsync("ReceiveNotification", new
            {
                notification.Id,
                notification.Message,
                notification.Type,
                notification.RelatedId,
                notification.CreatedAt
            });

            return new ApiResponse<object>(true, $"Product {status}", null);
        }

        private static UserDto MapUserToDto(User u) =>
            new(u.Id, u.Name, u.Email, u.Role, u.Status, u.CreatedAt);
    }
}
