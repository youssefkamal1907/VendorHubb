import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { productAPI, orderAPI, getApiErrorMessage } from '../../services/api';
import { Layout } from '../../components/layout/Sidebar';

// ─── Vendor Dashboard ─────────────────────────────────────────────────────────
export function VendorDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productAPI.stats()
      .then(res => setStats(res.data.data))
      .catch((err) => toast.error(getApiErrorMessage(err) || 'Could not load statistics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout><div className="loader"><div className="spinner" /></div></Layout>;

  return (
    <Layout>
      <div className="page-header"><h1 className="page-title">Vendor Dashboard</h1></div>
      {stats && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--accent3)' }}>${stats.totalRevenue?.toFixed(2)}</div>
              <div className="stat-label">Total Revenue</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--accent)' }}>{stats.totalOrders}</div>
              <div className="stat-label">Total Orders</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.approvedProducts}</div>
              <div className="stat-label">Live Products</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#ffc800' }}>{stats.pendingProducts}</div>
              <div className="stat-label">Pending Review</div>
            </div>
          </div>

          {stats.topProducts?.length > 0 && (
            <>
              <h2 style={{ fontSize: 18, marginBottom: 14 }}>Top Products</h2>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="table">
                  <thead><tr><th>Product</th><th>Units Sold</th></tr></thead>
                  <tbody>
                    {stats.topProducts.map((p, i) => (
                      <tr key={p.productId}>
                        <td><span style={{ color: 'var(--accent)', marginRight: 8 }}>#{i + 1}</span>{p.productTitle}</td>
                        <td style={{ fontWeight: 700 }}>{p.sales}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </Layout>
  );
}

// ─── Vendor Products ──────────────────────────────────────────────────────────
const EMPTY_FORM = { title: '', description: '', price: '', category: '', availableUnits: '', images: '' };

export function VendorProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    productAPI.myProducts().then(res => setProducts(res.data.data || [])).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => { setForm(EMPTY_FORM); setEditTarget(null); setShowModal(true); };
  const openEdit = (p) => {
    setForm({ title: p.title, description: p.description, price: p.price, category: p.category, availableUnits: p.availableUnits, images: p.images.join(', ') });
    setEditTarget(p.id);
    setShowModal(true);
  };

  const save = async () => {
    if (!form.title || !form.price || !form.category) return toast.error('Fill required fields');
    setSaving(true);
    try {
      const payload = { ...form, price: parseFloat(form.price), availableUnits: parseInt(form.availableUnits) || 0, images: form.images ? form.images.split(',').map(s => s.trim()) : [] };
      if (editTarget) {
        await productAPI.update(editTarget, payload);
        toast.success('Product updated');
      } else {
        await productAPI.create(payload);
        toast.success('Product submitted for review');
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try { await productAPI.remove(id); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  const f = (key) => ({ value: form[key], onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) });

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">My Products</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Product</button>
      </div>

      {loading ? <div className="loader"><div className="spinner" /></div>
        : products.length === 0
          ? <div className="empty"><div className="empty-icon">📦</div><p>No products yet</p><button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreate}>Add First Product</button></div>
          : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="table">
                <thead><tr><th>Title</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.title}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{p.category}</td>
                      <td style={{ color: 'var(--accent)', fontWeight: 700 }}>${p.price}</td>
                      <td>{p.availableUnits}</td>
                      <td><span className={`badge badge-${p.status.toLowerCase()}`}>{p.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => openEdit(p)}>Edit</button>
                          <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => remove(p.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{editTarget ? 'Edit Product' : 'New Product'}</div>
            <div className="form-group"><label>Title *</label><input className="input" placeholder="Product name" {...f('title')} /></div>
            <div className="form-group"><label>Description</label><textarea className="input" rows={3} placeholder="Describe the product..." {...f('description')} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group"><label>Price ($) *</label><input className="input" type="number" placeholder="29.99" {...f('price')} /></div>
              <div className="form-group"><label>Stock Units</label><input className="input" type="number" placeholder="100" {...f('availableUnits')} /></div>
            </div>
            <div className="form-group"><label>Category *</label>
              <select className="input" {...f('category')}>
                <option value="">Select category</option>
                {['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports', 'Food', 'Beauty', 'Toys', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Image URLs (comma separated)</label><input className="input" placeholder="https://..." {...f('images')} /></div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : editTarget ? 'Update' : 'Submit for Review'}</button>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

// ─── Product performance (views, sales, revenue per product) ─────────────────
export function VendorProductStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productAPI.stats()
      .then(res => setStats(res.data.data))
      .catch((err) => toast.error(getApiErrorMessage(err) || 'Could not load statistics'))
      .finally(() => setLoading(false));
  }, []);

  const rows = stats?.productPerformance || [];

  const chartData = useMemo(
    () =>
      rows.map((r) => ({
        shortName: r.productTitle.length > 22 ? `${r.productTitle.slice(0, 22)}…` : r.productTitle,
        title: r.productTitle,
        views: r.views,
        unitsSold: r.unitsSold,
        revenue: Number(r.revenue || 0),
      })),
    [rows]
  );

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">Product performance</h1>
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Views, sales, and revenue by product</div>
      </div>

      {loading ? <div className="loader"><div className="spinner" /></div>
        : (
          <>
          {rows.length > 0 && (
            <div className="card" style={{ padding: '20px 16px 12px', marginBottom: 20, overflow: 'hidden' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Performance chart</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                Views and units sold (left axis) · Revenue in USD (right axis)
              </p>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={chartData} margin={{ top: 8, right: 16, left: 4, bottom: 56 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                  <XAxis
                    dataKey="shortName"
                    tick={{ fill: '#9898a8', fontSize: 11 }}
                    interval={0}
                    angle={-26}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: '#9898a8', fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: '#9898a8', fontSize: 11 }}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(108, 99, 255, 0.07)' }}
                    contentStyle={{
                      background: '#12121a',
                      border: '1px solid #2a2a3a',
                      borderRadius: 8,
                      color: '#e8e8f0',
                    }}
                    labelFormatter={(_, p) => (p?.[0]?.payload?.title ? String(p[0].payload.title) : '')}
                    formatter={(value, name) => {
                      if (name === 'revenue' || name === 'Revenue ($)') return [`$${Number(value).toFixed(2)}`, 'Revenue'];
                      if (name === 'views' || name === 'Views') return [value, 'Views'];
                      return [value, 'Units sold'];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <Bar yAxisId="left" dataKey="views" name="Views" fill="#6c63ff" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="unitsSold" name="Units sold" fill="#43e97b" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="revenue" name="Revenue ($)" fill="#ffc800" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {rows.length === 0
              ? <div className="empty"><div className="empty-icon">📊</div>No products yet — add products to see statistics</div>
              : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Status</th>
                      <th>Views</th>
                      <th>Units sold</th>
                      <th>Revenue</th>
                      <th>Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.productId}>
                        <td style={{ fontWeight: 600 }}>{row.productTitle}</td>
                        <td><span className={`badge badge-${String(row.status || '').toLowerCase()}`}>{row.status}</span></td>
                        <td>{row.views}</td>
                        <td style={{ fontWeight: 700 }}>{row.unitsSold}</td>
                        <td style={{ color: 'var(--accent3)', fontWeight: 700 }}>${Number(row.revenue || 0).toFixed(2)}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                          {row.reviewCount > 0 ? `⭐ ${Number(row.averageRating).toFixed(1)} (${row.reviewCount})` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
          </>
        )}
    </Layout>
  );
}

// ─── Vendor Orders ────────────────────────────────────────────────────────────
export function VendorOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderAPI.vendorOrders().then(res => setOrders(res.data.data || [])).finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="page-header"><h1 className="page-title">Orders</h1></div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <div className="loader"><div className="spinner" /></div>
          : orders.length === 0
            ? <div className="empty"><div className="empty-icon">🛒</div>No orders yet</div>
            : (
              <table className="table">
                <thead><tr><th>Product</th><th>Customer</th><th>Qty</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 600 }}>{o.productTitle}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{o.customerName}</td>
                      <td>{o.quantity}</td>
                      <td style={{ color: 'var(--accent3)', fontWeight: 700 }}>${o.totalPrice.toFixed(2)}</td>
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
