using MongoDB.Driver;
using VendorHub.Models;

namespace VendorHub.Helpers
{
    public class MongoDbSettings
    {
        public string ConnectionString { get; set; } = null!;
        public string DatabaseName { get; set; } = null!;
    }

    public class MongoDbContext
    {
        private readonly IMongoDatabase _database;

        public MongoDbContext(MongoDbSettings settings)
        {
            var client = new MongoClient(settings.ConnectionString);
            _database = client.GetDatabase(settings.DatabaseName);
        }

        public IMongoCollection<User> Users => _database.GetCollection<User>("users");
        public IMongoCollection<Product> Products => _database.GetCollection<Product>("products");
        public IMongoCollection<Order> Orders => _database.GetCollection<Order>("orders");
        public IMongoCollection<Review> Reviews => _database.GetCollection<Review>("reviews");
        public IMongoCollection<Favorite> Favorites => _database.GetCollection<Favorite>("favorites");
        public IMongoCollection<Notification> Notifications => _database.GetCollection<Notification>("notifications");
    }
}
