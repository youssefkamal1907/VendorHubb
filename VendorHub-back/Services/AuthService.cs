using MongoDB.Driver;
using VendorHub.DTOs;
using VendorHub.Helpers;
using VendorHub.Interfaces;
using VendorHub.Models;
using BCrypt.Net;

namespace VendorHub.Services
{
    public class AuthService : IAuthService
    {
        private readonly MongoDbContext _db;
        private readonly JwtHelper _jwt;

        public AuthService(MongoDbContext db, JwtHelper jwt)
        {
            _db = db;
            _jwt = jwt;
        }

        public async Task<ApiResponse<AuthResponseDto>> RegisterAsync(RegisterDto dto)
        {
            // Check if email exists
            var existing = await _db.Users.Find(u => u.Email == dto.Email).FirstOrDefaultAsync();
            if (existing != null)
                return new ApiResponse<AuthResponseDto>(false, "Email already registered", null);

            // Only Admin and Customer are auto-Active; Vendors need admin approval
            var status = dto.Role == "Vendor" ? "Pending" : "Active";

            var user = new User
            {
                Name = dto.Name,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = dto.Role,
                Status = status
            };

            await _db.Users.InsertOneAsync(user);

            var token = _jwt.GenerateToken(user);
            var response = new AuthResponseDto(token, user.Id, user.Name, user.Email, user.Role, user.Status);
            return new ApiResponse<AuthResponseDto>(true, "Registered successfully", response);
        }

        public async Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginDto dto)
        {
            var user = await _db.Users.Find(u => u.Email == dto.Email).FirstOrDefaultAsync();
            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                return new ApiResponse<AuthResponseDto>(false, "Invalid email or password", null);

            // Vendors must be approved
            if (user.Role == "Vendor" && user.Status != "Active")
                return new ApiResponse<AuthResponseDto>(false, $"Your vendor account is {user.Status}", null);

            var token = _jwt.GenerateToken(user);
            var response = new AuthResponseDto(token, user.Id, user.Name, user.Email, user.Role, user.Status);
            return new ApiResponse<AuthResponseDto>(true, "Login successful", response);
        }
    }
}
