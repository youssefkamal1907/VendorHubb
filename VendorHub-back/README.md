# VendorHub - Backend Documentation

## Tech Stack
- **Backend:** ASP.NET Core 8 Web API
- **Database:** MongoDB
- **Auth:** JWT Bearer Tokens
- **Real-time:** SignalR
- **Frontend:** React (separate project)

---

## MongoDB Schema

### Collection: `users`
```json
{
  "_id": "ObjectId",
  "name": "string",
  "email": "string",          // unique
  "passwordHash": "string",
  "role": "Admin | Vendor | Customer",
  "status": "Pending | Active | Rejected",  // Vendors only use Pending/Active/Rejected
  "permissions": {
    "canAddProducts": true,
    "canEditProducts": true,
    "canDeleteProducts": true
  },
  "createdAt": "DateTime"
}
```

### Collection: `products`
```json
{
  "_id": "ObjectId",
  "vendorId": "ObjectId → users",
  "vendorName": "string",
  "title": "string",
  "description": "string",
  "price": "Decimal128",
  "category": "string",
  "images": ["string"],         // array of image URLs
  "availableUnits": "int",
  "numberOfViewers": "int",
  "status": "Pending | Approved | Rejected",
  "averageRating": "double",
  "reviewCount": "int",
  "createdAt": "DateTime",
  "updatedAt": "DateTime"
}
```

### Collection: `orders`
```json
{
  "_id": "ObjectId",
  "customerId": "ObjectId → users",
  "customerName": "string",
  "productId": "ObjectId → products",
  "productTitle": "string",
  "vendorId": "ObjectId → users",
  "quantity": "int",
  "totalPrice": "Decimal128",
  "status": "Confirmed | Shipped | Delivered",
  "createdAt": "DateTime"
}
```

### Collection: `reviews`
```json
{
  "_id": "ObjectId",
  "productId": "ObjectId → products",
  "customerId": "ObjectId → users",
  "customerName": "string",
  "rating": "int (1-5)",
  "comment": "string",
  "createdAt": "DateTime"
}
```

### Collection: `favorites`
```json
{
  "_id": "ObjectId",
  "customerId": "ObjectId → users",
  "productId": "ObjectId → products",
  "createdAt": "DateTime"
}
```

### Collection: `notifications`
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId → users",
  "message": "string",
  "type": "NewOrder | ProductApproved | ProductRejected | VendorApproved | VendorRejected",
  "isRead": "bool",
  "relatedId": "string?",       // orderId or productId
  "createdAt": "DateTime"
}
```

---

## 🔗 API Endpoints

### Auth  `POST /api/auth/...`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/register` | Public | Register (role: Admin/Vendor/Customer) |
| POST | `/api/auth/login` | Public | Login → returns JWT |

### Products  `GET/POST /api/products/...`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/products` | Public | Browse approved products (filter: category, search, price, page) |
| GET | `/api/products/{id}` | Public | Get product details (increments viewers) |
| POST | `/api/products` | Vendor | Create product (status: Pending) |
| PUT | `/api/products/{id}` | Vendor | Update own product |
| DELETE | `/api/products/{id}` | Vendor | Delete own product |
| GET | `/api/products/my` | Vendor | Get all own products |
| GET | `/api/products/stats` | Vendor | Sales history & performance stats |

### Admin  `GET/PUT /api/admin/...`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/admin/vendors` | Admin | Get all vendors |
| GET | `/api/admin/vendors/pending` | Admin | Get pending vendor accounts |
| PUT | `/api/admin/vendors/{id}/review?status=Active` | Admin | Approve/Reject vendor |
| PUT | `/api/admin/vendors/{id}/permissions` | Admin | Update vendor permissions |
| GET | `/api/admin/products/pending` | Admin | Get pending products |
| PUT | `/api/admin/products/{id}/review?status=Approved` | Admin | Approve/Reject product |

### Orders  `/api/orders/...`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/orders` | Customer | Place an order |
| GET | `/api/orders/my` | Customer | Get my order history |
| GET | `/api/orders/vendor` | Vendor | Get orders for vendor's products |

### Reviews  `/api/reviews/...`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/reviews/{productId}` | Public | Get product reviews |
| POST | `/api/reviews` | Customer | Add review (must have purchased) |

### Favorites  `/api/favorites/...`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/favorites` | Customer | Get my favorites list |
| POST | `/api/favorites/{productId}` | Customer | Toggle favorite (add/remove) |

### Notifications  `/api/notifications/...`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/notifications` | Any Auth | Get my notifications |
| PUT | `/api/notifications/read-all` | Any Auth | Mark all as read |

---

## ⚡ Real-Time (SignalR)

**Hub URL:** `ws://localhost:5000/hubs/notifications?access_token=JWT_TOKEN`

**React client example:**
```javascript
import * as signalR from "@microsoft/signalr";

const connection = new signalR.HubConnectionBuilder()
  .withUrl("http://localhost:5000/hubs/notifications", {
    accessTokenFactory: () => localStorage.getItem("token")
  })
  .withAutomaticReconnect()
  .build();

await connection.start();

connection.on("ReceiveNotification", (notification) => {
  console.log("New notification:", notification);
  // Show toast / update notification bell
});
```

**Events pushed from server:**
| Event | Triggered When | Sent To |
|-------|---------------|---------|
| `ReceiveNotification` (type: NewOrder) | Customer places order | Vendor |
| `ReceiveNotification` (type: ProductApproved) | Admin approves product | Vendor |
| `ReceiveNotification` (type: ProductRejected) | Admin rejects product | Vendor |
| `ReceiveNotification` (type: VendorApproved) | Admin approves vendor | Vendor |
| `ReceiveNotification` (type: VendorRejected) | Admin rejects vendor | Vendor |

---

## 🚀 Setup & Run

### Prerequisites
- .NET 8 SDK
- MongoDB running on `localhost:27017`

### Steps
```bash
# 1. Navigate to project
cd VendorHub

# 2. Restore packages
dotnet restore

# 3. Run
dotnet run
```

API runs on: `http://localhost:5000`
Swagger UI: `http://localhost:5000/swagger`

### Default Admin (seed on startup)
If MongoDB is reachable, the API creates an admin once (when that email does not exist yet). Configure in `appsettings.json` under `AdminSeed`:

- **Email:** `admin@vendorhub.local` (default)
- **Password:** `Admin123!` (default — change for production)
- Set `"Enabled": false` to turn off seeding.

### Create Admin manually (alternative)
Register via `/api/auth/register` with role `"Admin"`, then in MongoDB if needed:
```js
db.users.updateOne({ email: "your@email.com" }, { $set: { status: "Active" } })
```

---

## 📁 Project Structure

```
VendorHub/
├── Controllers/
│   └── Controllers.cs        # All controllers in one file
├── DTOs/
│   └── DTOs.cs               # All request/response DTOs
├── Helpers/
│   ├── JwtHelper.cs          # Token generation
│   └── MongoDbContext.cs     # DB collections
├── Hubs/
│   └── NotificationHub.cs    # SignalR hub
├── Interfaces/
│   └── IAuthService.cs
├── Models/
│   ├── User.cs
│   ├── Product.cs
│   └── OtherModels.cs        # Order, Review, Favorite, Notification
├── Services/
│   ├── AuthService.cs
│   ├── ProductService.cs
│   ├── OrderService.cs       # Includes SignalR notification
│   ├── AdminService.cs       # Includes SignalR notification
│   └── OtherServices.cs      # Review, Favorite, Notification services
├── Program.cs                # App config: JWT, MongoDB, SignalR, CORS
├── appsettings.json
└── VendorHub.csproj
```
