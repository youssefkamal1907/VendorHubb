import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import { Layout } from '../../components/layout/Sidebar';

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
export function AdminDashboard() {
  const [pendingVendors, setPendingVendors] = useState([]);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminAPI.getPendingVendors(), adminAPI.getPendingProducts()])
      .then(([v, p]) => {
        setPendingVendors(v.data.data || []);
        setPendingProducts(p.data.data || []);
      }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout><div className="loader"><div className="spinner" /></div></Layout>;

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--accent2)' }}>{pendingVendors.length}</div>
          <div className="stat-label">Pending Vendors</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#ffc800' }}>{pendingProducts.length}</div>
          <div className="stat-label">Pending Products</div>
        </div>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Use the sidebar to manage vendors and products.</p>
    </Layout>
  );
}

// ─── Admin Vendors ────────────────────────────────────────────────────────────
export function AdminVendors() {
  const [vendors, setVendors] = useState([]);
  const [tab, setTab] = useState('all'); // all | pending
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [perms, setPerms] = useState({ canAddProducts: true, canEditProducts: true, canDeleteProducts: true });

  const load = () => {
    setLoading(true);
    const req = tab === 'pending' ? adminAPI.getPendingVendors() : adminAPI.getVendors();
    req.then(res => setVendors(res.data.data || [])).finally(() => setLoading(false));
  };

  useEffect(load, [tab]); // eslint-disable-line

  const review = async (id, status) => {
    try {
      await adminAPI.reviewVendor(id, status);
      toast.success(`Vendor ${status === 'Active' ? 'approved' : 'rejected'}`);
      load();
    } catch { toast.error('Failed'); }
  };

  const savePerms = async () => {
    try {
      await adminAPI.updatePermissions(selected.id, perms);
      toast.success('Permissions updated');
      setSelected(null);
    } catch { toast.error('Failed'); }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">Vendors</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'pending'].map(t => (
            <button key={t} className={`btn ${tab === t ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(t)}>
              {t === 'all' ? 'All Vendors' : '⏳ Pending'}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <div className="loader"><div className="spinner" /></div> : vendors.length === 0
          ? <div className="empty"><div className="empty-icon">🏪</div>No vendors found</div>
          : (
            <table className="table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {vendors.map(v => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 600 }}>{v.name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{v.email}</td>
                    <td><span className={`badge badge-${v.status.toLowerCase()}`}>{v.status}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{new Date(v.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {v.status === 'Pending' && <>
                          <button className="btn btn-success" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => review(v.id, 'Active')}>Approve</button>
                          <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => review(v.id, 'Rejected')}>Reject</button>
                        </>}
                        {v.status === 'Active' && (
                          <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }}
                            onClick={() => { setSelected(v); setPerms(v.permissions || perms); }}>
                            ⚙️ Permissions
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {/* Permissions Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Permissions — {selected.name}</div>
            {[['canAddProducts', 'Can Add Products'], ['canEditProducts', 'Can Edit Products'], ['canDeleteProducts', 'Can Delete Products']].map(([key, label]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, cursor: 'pointer' }}>
                <input type="checkbox" checked={perms[key]} onChange={e => setPerms(p => ({ ...p, [key]: e.target.checked }))}
                  style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
                <span>{label}</span>
              </label>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-primary" onClick={savePerms}>Save Changes</button>
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

// ─── Admin Products ───────────────────────────────────────────────────────────
export function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    adminAPI.getPendingProducts().then(res => setProducts(res.data.data || [])).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const review = async (id, status) => {
    try {
      await adminAPI.reviewProduct(id, status);
      toast.success(`Product ${status === 'Approved' ? 'approved' : 'rejected'}`);
      load();
    } catch { toast.error('Failed'); }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">Pending Products</h1>
        <span className="badge badge-pending">{products.length} pending</span>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <div className="loader"><div className="spinner" /></div> : products.length === 0
          ? <div className="empty"><div className="empty-icon">✅</div>All products reviewed!</div>
          : (
            <table className="table">
              <thead>
                <tr><th>Product</th><th>Vendor</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{p.description.slice(0, 60)}...</div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.vendorName}</td>
                    <td><span className="badge badge-pending">{p.category}</span></td>
                    <td style={{ fontWeight: 700, color: 'var(--accent)' }}>${p.price}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.availableUnits}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-success" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => review(p.id, 'Approved')}>Approve</button>
                        <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => review(p.id, 'Rejected')}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </Layout>
  );
}
