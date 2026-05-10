using VendorHub.DTOs;

namespace VendorHub.Interfaces
{
    public interface IAuthService
    {
        Task<ApiResponse<AuthResponseDto>> RegisterAsync(RegisterDto dto);
        Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginDto dto);
Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginDto dto);
    }
}
