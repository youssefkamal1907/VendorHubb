import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage, RegisterPage } from './pages/auth/AuthPages';
import { AdminDashboard, AdminVendors, AdminProducts } from './pages/admin/AdminPages';
import { VendorDashboard, VendorProducts, VendorOrders, VendorProductStats } from './pages/vendor/VendorPages';
import { ShopPage, FavoritesPage, CustomerOrders } from './pages/customer/CustomerPages';

// ─── Route Guard ──────────────────────────────────────────────────────────────
function RequireRole({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/login" replace />;
  return children;
}

/** Logged-in customers only (favorites, orders). Guests → login; other roles → their dashboard. */
function RequireCustomer({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== 'Customer') {
    const home = { Admin: '/admin', Vendor: '/vendor' }[user.role] || '/shop';
    return <Navigate to={home} replace />;
  }
  return children;
}

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/shop" replace />;
  const routes = { Admin: '/admin', Vendor: '/vendor', Customer: '/shop' };
  return <Navigate to={routes[user.role] || '/shop'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Admin */}
      <Route path="/admin" element={<RequireRole role="Admin"><AdminDashboard /></RequireRole>} />
      <Route path="/admin/vendors" element={<RequireRole role="Admin"><AdminVendors /></RequireRole>} />
      <Route path="/admin/products" element={<RequireRole role="Admin"><AdminProducts /></RequireRole>} />

      {/* Vendor */}
      <Route path="/vendor" element={<RequireRole role="Vendor"><VendorDashboard /></RequireRole>} />
      <Route path="/vendor/products" element={<RequireRole role="Vendor"><VendorProducts /></RequireRole>} />
      <Route path="/vendor/orders" element={<RequireRole role="Vendor"><VendorOrders /></RequireRole>} />
      <Route path="/vendor/stats" element={<RequireRole role="Vendor"><VendorProductStats /></RequireRole>} />

      {/* Customer: browse without login; favorites & orders require a Customer account */}
      <Route path="/shop" element={<ShopPage />} />
      <Route path="/shop/favorites" element={<RequireCustomer><FavoritesPage /></RequireCustomer>} />
      <Route path="/shop/orders" element={<RequireCustomer><CustomerOrders /></RequireCustomer>} />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1a1a24', color: '#e8e8f0', border: '1px solid #2a2a3a', fontFamily: 'DM Sans' },
            success: { iconTheme: { primary: '#43e97b', secondary: '#0a0a0f' } },
            error: { iconTheme: { primary: '#ff6584', secondary: '#0a0a0f' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
