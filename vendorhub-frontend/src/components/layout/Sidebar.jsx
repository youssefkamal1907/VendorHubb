import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const adminLinks = [
  { to: '/admin', icon: '◈', label: 'Dashboard', end: true },
  { to: '/admin/vendors', icon: '🏪', label: 'Vendors' },
  { to: '/admin/products', icon: '📦', label: 'Products' },
];

const vendorLinks = [
  { to: '/vendor', icon: '◈', label: 'Dashboard', end: true },
  { to: '/vendor/products', icon: '📦', label: 'My Products' },
  { to: '/vendor/orders', icon: '🛒', label: 'Orders' },
  { to: '/vendor/stats', icon: '📊', label: 'Analytics' },
];

const customerLinks = [
  { to: '/shop', icon: '🛍️', label: 'Shop', end: true },
  { to: '/shop/favorites', icon: '❤️', label: 'Favorites' },
  { to: '/shop/orders', icon: '📋', label: 'My Orders' },
];

const guestLinks = [{ to: '/shop', icon: '🛍️', label: 'Shop', end: true }];

export function Sidebar() {
  const { user, logout, unreadCount, notifications, markAllRead } = useAuth();
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);

  const links = !user
    ? guestLinks
    : user.role === 'Admin'
      ? adminLinks
      : user.role === 'Vendor'
        ? vendorLinks
        : customerLinks;
  const roleColors = { Admin: '#ff6584', Vendor: '#6c63ff', Customer: '#43e97b' };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Syne', letterSpacing: '-0.5px' }}>
          Vendor<span style={{ color: 'var(--accent)' }}>Hub</span>
        </div>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: roleColors[user?.role] || '#3d3d52', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.name || 'Guest'}</div>
            <div style={{ fontSize: 11, color: user ? roleColors[user.role] : 'var(--text-muted)', fontWeight: 600 }}>
              {user?.role || 'Browse only'}
            </div>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <nav style={{ flex: 1, padding: '16px 12px' }}>
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 8, marginBottom: 4,
              fontSize: 14, fontWeight: 500, transition: 'all 0.2s',
              background: isActive ? 'rgba(108,99,255,0.15)' : 'transparent',
              color: isActive ? 'var(--accent)' : 'var(--text-muted)',
              borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
            })}
          >
            <span>{link.icon}</span> {link.label}
          </NavLink>
        ))}
      </nav>

      {/* Notifications (signed-in only) */}
      {user && (
        <div style={{ padding: '0 12px 8px', position: 'relative' }}>
          <button
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'space-between' }}
            onClick={() => { setShowNotifs(v => !v); if (!showNotifs && unreadCount > 0) markAllRead(); }}
          >
            <span>🔔 Notifications</span>
            {unreadCount > 0 && (
              <span style={{ background: 'var(--accent2)', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div style={{ position: 'absolute', bottom: '100%', left: 12, right: 12, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, maxHeight: 300, overflowY: 'auto', zIndex: 200 }}>
              {notifications.length === 0
                ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No notifications</div>
                : notifications.slice(0, 10).map(n => (
                  <div key={n.id} style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontSize: 13, background: n.isRead ? 'transparent' : 'rgba(108,99,255,0.07)' }}>
                    <div>{n.message}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
                      {new Date(n.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      )}

      {/* Auth */}
      <div style={{ padding: '8px 12px 0', borderTop: '1px solid var(--border)' }}>
        {user ? (
          <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => { logout(); navigate('/shop'); }}>
            ← Log out
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link to="/login" state={{ from: '/shop' }} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none', display: 'flex' }}>
              Sign in
            </Link>
            <Link to="/register" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none', display: 'flex' }}>
              Register
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}

export function Layout({ children }) {
  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content fade-in">{children}</main>
    </div>
  );
}
