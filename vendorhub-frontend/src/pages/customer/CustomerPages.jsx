import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { productAPI, orderAPI, favoriteAPI, reviewAPI } from '../../services/api';
import { Layout } from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';

// ─── Shop / Browse ────────────────────────────────────────────────────────────
export function ShopPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ category: '', search: '', minPrice: '', maxPrice: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const pageSize = 12;

  const load = (p = 1) => {
    setLoading(true);
    productAPI.browse({ ...filters, page: p, pageSize })
      .then(res => { setProducts(res.data.data?.items || []); setTotal(res.data.data?.total || 0); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1); setPage(1); }, [filters]); // eslint-disable-line

  const categories = ['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports', 'Food', 'Beauty', 'Toys', 'Other'];

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">Shop</h1>
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{total} products</div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <input className="input" style={{ maxWidth: 260 }} placeholder="🔍 Search products..." value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
        <select className="input" style={{ maxWidth: 180 }} value={filters.category}
          onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input className="input" style={{ maxWidth: 120 }} type="number" placeholder="Min $" value={filters.minPrice}
          onChange={e => setFilters(f => ({ ...f, minPrice: e.target.value }))} />
        <input className="input" style={{ maxWidth: 120 }} type="number" placeholder="Max $" value={filters.maxPrice}
          onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value }))} />
      </div>

      {loading ? <div className="loader"><div className="spinner" /></div>
        : products.length === 0
          ? <div className="empty"><div className="empty-icon">🔍</div>No products found</div>
          : (
            <>
              <div className="product-grid">
                {products.map(p => (
                  <div key={p.id} className="product-card" onClick={() => setSelected(p)}>
                    <div className="product-card-img">
                      {p.images?.[0] ? <img src={p.images[0]} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦'}
                    </div>
                    <div className="product-card-body">
                      <div className="product-card-title">{p.title}</div>
                      <div className="product-card-price">${p.price}</div>
                      <div className="product-card-meta">
                        {p.category} · {p.availableUnits} in stock
                        {p.averageRating > 0 && <span> · ⭐ {p.averageRating.toFixed(1)}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {total > pageSize && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 28 }}>
                  <button className="btn btn-ghost" disabled={page === 1} onClick={() => { setPage(p => p - 1); load(page - 1); }}>← Prev</button>
                  <span style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>Page {page} of {Math.ceil(total / pageSize)}</span>
                  <button className="btn btn-ghost" disabled={page >= Math.ceil(total / pageSize)} onClick={() => { setPage(p => p + 1); load(page + 1); }}>Next →</button>
                </div>
              )}
            </>
          )}

      {/* Product Detail Modal */}
      {selected && <ProductModal product={selected} onClose={() => setSelected(null)} />}
    </Layout>
  );
}

// ─── Product Detail Modal ─────────────────────────────────────────────────────
function ProductModal({ product, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isCustomer = user?.role === 'Customer';
  /** Fresh from API — triggers view count on server (GET /products/:id) */
  const [displayProduct, setDisplayProduct] = useState(product);
  const [qty, setQty] = useState(1);
  const [ordering, setOrdering] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [addingReview, setAddingReview] = useState(false);

  const handleClose = () => {
    try {
      sessionStorage.removeItem(`vh_product_view_${product.id}`);
    } catch { /* ignore */ }
    onClose();
  };

  const goLogin = () => {
    toast('Sign in as a customer to continue');
    navigate('/login', { state: { from: '/shop' } });
    handleClose();
  };

  useEffect(() => {
    const key = `vh_product_view_${product.id}`;
    setDisplayProduct(product);
    setQty(1);
    let cancelled = false;
    // One counted view per modal open (React Strict Mode runs this twice; second call skips increment)
    let recordView = true;
    try {
      if (sessionStorage.getItem(key)) recordView = false;
      else sessionStorage.setItem(key, '1');
    } catch {
      recordView = true;
    }

    productAPI
      .getById(product.id, { params: { recordView } })
      .then((res) => {
        const d = res.data?.data;
        if (!cancelled && d) setDisplayProduct(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [product.id]);

  useEffect(() => {
    reviewAPI.getByProduct(product.id).then(res => setReviews(res.data.data || []));
  }, [product.id]);

  const placeOrder = async () => {
    if (!user) return goLogin();
    if (!isCustomer) return toast.error('Only customer accounts can place orders');
    if (qty < 1 || qty > displayProduct.availableUnits) return toast.error('Invalid quantity');
    setOrdering(true);
    try {
      await orderAPI.place({ productId: displayProduct.id, quantity: qty });
      toast.success('Order placed! 🎉');
      handleClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Order failed');
    } finally { setOrdering(false); }
  };

  const addToFavs = async () => {
    if (!user) return goLogin();
    if (!isCustomer) return toast.error('Favorites are for customer accounts');
    try { const res = await favoriteAPI.toggle(displayProduct.id); toast.success(res.data.message); }
    catch { toast.error('Failed'); }
  };

  const submitReview = async () => {
    if (!user) return goLogin();
    if (!isCustomer) return toast.error('Only customers can leave reviews');
    if (!newReview.comment) return toast.error('Write a comment');
    setAddingReview(true);
    try {
      const res = await reviewAPI.add({ productId: displayProduct.id, ...newReview });
      setReviews(r => [res.data.data, ...r]);
      setNewReview({ rating: 5, comment: '' });
      toast.success('Review added!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setAddingReview(false); }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
        {displayProduct.images?.[0] && (
          <img src={displayProduct.images[0]} alt={displayProduct.title} style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 10, marginBottom: 20 }} />
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: 22 }}>{displayProduct.title}</h2>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
              by {displayProduct.vendorName} · {displayProduct.category}
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent)' }}>${displayProduct.price}</div>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '14px 0' }}>{displayProduct.description}</p>

        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
          <span>📦 {displayProduct.availableUnits} in stock</span>
          <span>👁️ {displayProduct.numberOfViewers} views</span>
          {displayProduct.averageRating > 0 && <span>⭐ {displayProduct.averageRating.toFixed(1)} ({displayProduct.reviewCount})</span>}
        </div>

        {/* Buy / Favorite — purchase requires a signed-in customer (enforced on API too) */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
          <input type="number" className="input" min={1} max={displayProduct.availableUnits} value={qty}
            onChange={e => setQty(parseInt(e.target.value, 10) || 1)}
            style={{ maxWidth: 80 }} disabled={!isCustomer && !!user} />
          {!user ? (
            <button className="btn btn-primary" onClick={goLogin} disabled={displayProduct.availableUnits === 0}>
              {displayProduct.availableUnits === 0 ? 'Out of Stock' : 'Sign in to purchase'}
            </button>
          ) : !isCustomer ? (
            <button className="btn btn-primary" type="button" disabled title="Use a customer account to buy">
              Purchase (customers only)
            </button>
          ) : (
            <button className="btn btn-primary" onClick={placeOrder} disabled={ordering || displayProduct.availableUnits === 0}>
              {displayProduct.availableUnits === 0 ? 'Out of Stock' : ordering ? 'Placing...' : '🛒 Buy Now'}
            </button>
          )}
          <button className="btn btn-ghost" onClick={addToFavs} disabled={user && !isCustomer}>
            ❤️ Favorite
          </button>
        </div>
        {!user && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: -16, marginBottom: 24 }}>
            You can browse without an account. Sign in as a customer to buy, save favorites, or review.
          </p>
        )}

        {/* Reviews */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Reviews ({reviews.length})</h3>

          {/* Add review — customers only */}
          {isCustomer ? (
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Rating:</label>
                <select className="input" style={{ width: 80 }} value={newReview.rating}
                  onChange={e => setNewReview(r => ({ ...r, rating: parseInt(e.target.value, 10) }))}>
                  {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{'⭐'.repeat(n)}</option>)}
                </select>
              </div>
              <textarea className="input" rows={2} placeholder="Write a review (must have purchased)..." value={newReview.comment}
                onChange={e => setNewReview(r => ({ ...r, comment: e.target.value }))} />
              <button className="btn btn-primary" style={{ marginTop: 8, padding: '8px 16px', fontSize: 13 }}
                onClick={submitReview} disabled={addingReview}>
                {addingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              {user ? 'Reviews are available to customer accounts.' : 'Sign in as a customer to write a review.'}
            </div>
          )}

          {reviews.length === 0
            ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No reviews yet</div>
            : reviews.map(r => (
              <div key={r.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{r.customerName}</span>
                  <span>{'⭐'.repeat(r.rating)}</span>
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{r.comment}</div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// ─── Favorites ────────────────────────────────────────────────────────────────
export function FavoritesPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    favoriteAPI.getAll().then(res => setProducts(res.data.data || [])).finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="page-header"><h1 className="page-title">❤️ Favorites</h1></div>
      {loading ? <div className="loader"><div className="spinner" /></div>
        : products.length === 0
          ? <div className="empty"><div className="empty-icon">❤️</div>No favorites yet</div>
          : (
            <div className="product-grid">
              {products.map(p => (
                <div key={p.id} className="product-card" onClick={() => setSelected(p)}>
                  <div className="product-card-img">
                    {p.images?.[0] ? <img src={p.images[0]} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦'}
                  </div>
                  <div className="product-card-body">
                    <div className="product-card-title">{p.title}</div>
                    <div className="product-card-price">${p.price}</div>
                    <div className="product-card-meta">{p.category}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
      {selected && <ProductModal product={selected} onClose={() => setSelected(null)} />}
    </Layout>
  );
}

// ─── Customer Orders ──────────────────────────────────────────────────────────
export function CustomerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderAPI.myOrders().then(res => setOrders(res.data.data || [])).finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="page-header"><h1 className="page-title">My Orders</h1></div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <div className="loader"><div className="spinner" /></div>
          : orders.length === 0
            ? <div className="empty"><div className="empty-icon">📋</div>No orders yet</div>
            : (
              <table className="table">
                <thead><tr><th>Product</th><th>Qty</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 600 }}>{o.productTitle}</td>
                      <td>{o.quantity}</td>
                      <td style={{ color: 'var(--accent)', fontWeight: 700 }}>${o.totalPrice.toFixed(2)}</td>
                      <td><span className="badge badge-approved">{o.status}</span></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
      </div>
    </Layout>
  );
}
