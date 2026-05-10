using MongoDB.Driver;
using VendorHub.Models;

namespace VendorHub.Helpers;

public static class AdminSeeder
{
    public static async Task EnsureDefaultAdminAsync(MongoDbContext db, IConfiguration configuration)
    {
        var section = configuration.GetSection("AdminSeed");
        if (!section.GetValue("Enabled", true))
            return;

        var email = section["Email"]?.Trim();
        var password = section["Password"];
        var name = section["Name"]?.Trim();
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            return;

        name = string.IsNullOrWhiteSpace(name) ? "Administrator" : name;

        var exists = await db.Users.CountDocumentsAsync(u => u.Email == email) > 0;
        if (exists)
            return;

        var user = new User
        {
            Name = name,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Role = "Admin",
            Status = "Active"
        };

        await db.Users.InsertOneAsync(user);
    }
}
