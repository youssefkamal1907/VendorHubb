using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace VendorHub.Models
{
    public class Product
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = null!;

        [BsonElement("vendorId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string VendorId { get; set; } = null!;

        [BsonElement("vendorName")]
        public string VendorName { get; set; } = null!;

        [BsonElement("title")]
        public string Title { get; set; } = null!;

        [BsonElement("description")]
        public string Description { get; set; } = null!;

        [BsonElement("price")]
        public decimal Price { get; set; }

        [BsonElement("category")]
        public string Category { get; set; } = null!;

        [BsonElement("images")]
        public List<string> Images { get; set; } = new();

        [BsonElement("availableUnits")]
        public int AvailableUnits { get; set; }

        [BsonElement("numberOfViewers")]
        public int NumberOfViewers { get; set; } = 0;

        [BsonElement("status")]
        public string Status { get; set; } = "Pending"; // Pending | Approved | Rejected

        [BsonElement("averageRating")]
        public double AverageRating { get; set; } = 0;

        [BsonElement("reviewCount")]
        public int ReviewCount { get; set; } = 0;

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("updatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
