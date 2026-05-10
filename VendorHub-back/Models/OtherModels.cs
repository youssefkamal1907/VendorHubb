using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace VendorHub.Models
{
    public class Order
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = null!;

        [BsonElement("customerId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string CustomerId { get; set; } = null!;

        [BsonElement("customerName")]
        public string CustomerName { get; set; } = null!;

        [BsonElement("productId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string ProductId { get; set; } = null!;

        [BsonElement("productTitle")]
        public string ProductTitle { get; set; } = null!;

        [BsonElement("vendorId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string VendorId { get; set; } = null!;

        [BsonElement("quantity")]
        public int Quantity { get; set; }

        [BsonElement("totalPrice")]
        public decimal TotalPrice { get; set; }

        [BsonElement("status")]
        public string Status { get; set; } = "Confirmed"; // Confirmed | Shipped | Delivered

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class Review
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = null!;

        [BsonElement("productId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string ProductId { get; set; } = null!;

        [BsonElement("customerId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string CustomerId { get; set; } = null!;

        [BsonElement("customerName")]
        public string CustomerName { get; set; } = null!;

        [BsonElement("rating")]
        public int Rating { get; set; } // 1-5

        [BsonElement("comment")]
        public string Comment { get; set; } = null!;

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class Favorite
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = null!;

        [BsonElement("customerId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string CustomerId { get; set; } = null!;

        [BsonElement("productId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string ProductId { get; set; } = null!;

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class Notification
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = null!;

        [BsonElement("userId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string UserId { get; set; } = null!;

        [BsonElement("message")]
        public string Message { get; set; } = null!;

        [BsonElement("type")]
        public string Type { get; set; } = null!; // NewOrder | ProductApproved | ProductRejected

        [BsonElement("isRead")]
        public bool IsRead { get; set; } = false;

        [BsonElement("relatedId")]
        public string? RelatedId { get; set; } // orderId or productId

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
