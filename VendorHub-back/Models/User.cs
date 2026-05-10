using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
// بتقول ازاي ال سي شارب تتحول لمونجو و العكس

namespace VendorHub.Models
{
    public class User
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = null!;
        [BsonElement("name")]
        public string Name { get; set; } = null!;
        [BsonElement("email")]
        public string Email { get; set; } = null!;
        [BsonElement("passwordHash")]
        public string PasswordHash { get; set; } = null!;
        [BsonElement("role")]
        public string Role { get; set; } = "Customer"; // Admin | Vendor | Customer
        [BsonElement("status")]
        public string Status { get; set; } = "Pending"; // Pending | Active | Rejected (for Vendors)

        [BsonElement("permissions")]
        public VendorPermissions Permissions { get; set; } = new();

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class VendorPermissions
    {
        [BsonElement("canAddProducts")]
        public bool CanAddProducts { get; set; } = true;

        [BsonElement("canEditProducts")]
        public bool CanEditProducts { get; set; } = true;

        [BsonElement("canDeleteProducts")]
        public bool CanDeleteProducts { get; set; } = true;
    }
}
