using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using VendorHub.DTOs;
using VendorHub.Interfaces;
using VendorHub.Services;

// Auth Controller
namespace VendorHub.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _auth;
        public AuthController(IAuthService auth) => _auth = auth;

        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterDto dto)
        {
            var result = await _auth.RegisterAsync(dto);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto dto)
        {
            var result = await _auth.LoginAsync(dto);
            return result.Success ? Ok(result) : Unauthorized(result);
        }
    }

    // Admin Controller
    [ApiController]
    [Route("api/admin")]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly AdminService _admin;
        private readonly ProductService _product;

        public AdminController(AdminService admin, ProductService product)
        {
            _admin = admin;
            _product = product;
        }

        [HttpGet("vendors")]
        public async Task<IActionResult> GetAllVendors() =>
            Ok(await _admin.GetAllVendorsAsync());

        [HttpGet("vendors/pending")]
        public async Task<IActionResult> GetPendingVendors() =>
            Ok(await _admin.GetPendingVendorsAsync());

        [HttpPut("vendors/{vendorId}/review")]
        public async Task<IActionResult> ReviewVendor(string vendorId, [FromQuery] string status)
        {
            if (status != "Active" && status != "Rejected")
                return BadRequest("Status must be 'Active' or 'Rejected'");
            var result = await _admin.ReviewVendorAsync(vendorId, status);
            return result.Success ? Ok(result) : NotFound(result);
        }

        [HttpPut("vendors/{vendorId}/permissions")]
        public async Task<IActionResult> UpdatePermissions(string vendorId, UpdatePermissionsDto dto)
        {
            var result = await _admin.UpdatePermissionsAsync(vendorId, dto);
            return result.Success ? Ok(result) : NotFound(result);
        }

        [HttpGet("products/pending")]
        public async Task<IActionResult> GetPendingProducts() =>
            Ok(await _product.GetPendingAsync());

        [HttpPut("products/{productId}/review")]
        public async Task<IActionResult> ReviewProduct(string productId, [FromQuery] string status)
        {
            if (status != "Approved" && status != "Rejected")
                return BadRequest("Status must be 'Approved' or 'Rejected'");
            var result = await _admin.ReviewProductAsync(productId, status, _product);
            return result.Success ? Ok(result) : NotFound(result);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Product Controller
    // ─────────────────────────────────────────────────────────────────────────
    [ApiController]
    [Route("api/products")]
    public class ProductController : ControllerBase
    {
        private readonly ProductService _product;
        public ProductController(ProductService product) => _product = product;

        private string UserId => User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        private string UserName => User.FindFirst(ClaimTypes.Name)?.Value!;

        // Public: browse approved products
        [HttpGet]
        public async Task<IActionResult> Browse(
            [FromQuery] string? category,
            [FromQuery] string? search,
            [FromQuery] decimal? minPrice,
            [FromQuery] decimal? maxPrice,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 12)
        {
            return Ok(await _product.BrowseAsync(category, search, minPrice, maxPrice, page, pageSize));
        }

        // Vendor: my products & stats MUST be declared before [HttpGet("{id}")] or "my"/"stats" are captured as ids.
        [HttpGet("my")]
        [Authorize(Roles = "Vendor")]
        public async Task<IActionResult> MyProducts() =>
            Ok(await _product.GetVendorProductsAsync(UserId));

        [HttpGet("stats")]
        [Authorize(Roles = "Vendor")]
        public async Task<IActionResult> Stats() =>
            Ok(await _product.GetSalesStatsAsync(UserId));

        // Public: get single product (recordView=false skips counter — use for refresh after first counted load)
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id, [FromQuery] bool recordView = true)
        {
            var result = await _product.GetByIdAsync(id, recordView);
            return result.Success ? Ok(result) : NotFound(result);
        }

        // Vendor: create product
        [HttpPost]
        [Authorize(Roles = "Vendor")]
        public async Task<IActionResult> Create(CreateProductDto dto)
        {
            var result = await _product.CreateAsync(UserId, UserName, dto);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        // Vendor: update product
        [HttpPut("{id}")]
        [Authorize(Roles = "Vendor")]
        public async Task<IActionResult> Update(string id, UpdateProductDto dto)
        {
            var result = await _product.UpdateAsync(id, UserId, dto);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        // Vendor: delete product
        [HttpDelete("{id}")]
        [Authorize(Roles = "Vendor")]
        public async Task<IActionResult> Delete(string id)
        {
            var result = await _product.DeleteAsync(id, UserId);
            return result.Success ? Ok(result) : NotFound(result);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Order Controller
    // ─────────────────────────────────────────────────────────────────────────
    [ApiController]
    [Route("api/orders")]
    [Authorize]
    public class OrderController : ControllerBase
    {
        private readonly OrderService _order;
        public OrderController(OrderService order) => _order = order;

        private string UserId => User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        private string UserName => User.FindFirst(ClaimTypes.Name)?.Value!;
        private string UserRole => User.FindFirst(ClaimTypes.Role)?.Value!;

        [HttpPost]
        [Authorize(Roles = "Customer")]
        public async Task<IActionResult> PlaceOrder(CreateOrderDto dto)
        {
            var result = await _order.CreateOrderAsync(UserId, UserName, dto);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        [HttpGet("my")]
        [Authorize(Roles = "Customer")]
        public async Task<IActionResult> MyOrders() =>
            Ok(await _order.GetCustomerOrdersAsync(UserId));

        [HttpGet("vendor")]
        [Authorize(Roles = "Vendor")]
        public async Task<IActionResult> VendorOrders() =>
            Ok(await _order.GetVendorOrdersAsync(UserId));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Review Controller
    // ─────────────────────────────────────────────────────────────────────────
    [ApiController]
    [Route("api/reviews")]
    public class ReviewController : ControllerBase
    {
        private readonly ReviewService _review;
        public ReviewController(ReviewService review) => _review = review;

        private string UserId => User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        private string UserName => User.FindFirst(ClaimTypes.Name)?.Value!;

        [HttpGet("{productId}")]
        public async Task<IActionResult> GetProductReviews(string productId) =>
            Ok(await _review.GetProductReviewsAsync(productId));

        [HttpPost]
        [Authorize(Roles = "Customer")]
        public async Task<IActionResult> AddReview(CreateReviewDto dto)
        {
            var result = await _review.AddReviewAsync(UserId, UserName, dto);
            return result.Success ? Ok(result) : BadRequest(result);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Favorites Controller
    // ─────────────────────────────────────────────────────────────────────────
    [ApiController]
    [Route("api/favorites")]
    [Authorize(Roles = "Customer")]
    public class FavoriteController : ControllerBase
    {
        private readonly FavoriteService _fav;
        public FavoriteController(FavoriteService fav) => _fav = fav;

        private string UserId => User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;

        [HttpGet]
        public async Task<IActionResult> GetFavorites() =>
            Ok(await _fav.GetFavoritesAsync(UserId));

        [HttpPost("{productId}")]
        public async Task<IActionResult> Toggle(string productId) =>
            Ok(await _fav.ToggleFavoriteAsync(UserId, productId));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Notifications Controller
    // ─────────────────────────────────────────────────────────────────────────
    [ApiController]
    [Route("api/notifications")]
    [Authorize]
    public class NotificationController : ControllerBase
    {
        private readonly NotificationService _notif;
        public NotificationController(NotificationService notif) => _notif = notif;

        private string UserId => User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;

        [HttpGet]
        public async Task<IActionResult> GetNotifications() =>
            Ok(await _notif.GetUserNotificationsAsync(UserId));

        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllRead() =>
            Ok(await _notif.MarkAllReadAsync(UserId));
    }
}
