import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI, parseAuthResponse, getApiErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const authStyles = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(ellipse at 20% 50%, rgba(108,99,255,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(255,101,132,0.06) 0%, transparent 60%), var(--bg)',
  },
  box: {
    background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20,
    padding: 40, width: '100%', maxWidth: 420,
    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
    animation: 'fadeIn 0.4s ease'
  },
  logo: { fontSize: 28, fontWeight: 800, fontFamily: 'Syne', marginBottom: 8, letterSpacing: '-0.5px' },
  sub: { color: 'var(--text-muted)', fontSize: 14, marginBottom: 28 },
};

export function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.from;

  const handleSubmit = async () => {
    if (!form.email || !form.password) return toast.error('Fill all fields');
    setLoading(true);
    try {
      const res = await authAPI.login(form);
      const parsed = parseAuthResponse(res);
      if (!parsed) {
        toast.error('Unexpected response from server. Check API version.');
        return;
      }
      const { token, userData } = parsed;
      login(userData, token);
      toast.success(`Welcome back, ${userData.name}!`);
      const routes = { Admin: '/admin', Vendor: '/vendor', Customer: '/shop' };
      const home = routes[userData.role] || '/shop';
      const canUseReturn =
        typeof returnTo === 'string' &&
        returnTo.startsWith('/') &&
        !returnTo.startsWith('/login') &&
        !returnTo.startsWith('/register');
      if (userData.role === 'Customer' && canUseReturn) navigate(returnTo, { replace: true });
      else navigate(home, { replace: true });
    } catch (err) {
      toast.error(getApiErrorMessage(err) || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={authStyles.page}>
      <div style={authStyles.box}>
        <div style={authStyles.logo}>Vendor<span style={{ color: 'var(--accent)' }}>Hub</span></div>
        <div style={authStyles.sub}>Sign in to your account</div>

        <div className="form-group">
          <label>Email</label>
          <input className="input" type="email" placeholder="you@email.com" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input className="input" type="password" placeholder="••••••••" value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        </div>

        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px', marginTop: 8 }}
          onClick={handleSubmit} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In →'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <Link to="/register" state={location.state} style={{ color: 'var(--accent)', fontWeight: 600 }}>Register</Link>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Customer' });
  const [loading, setLoading] = useState(false);
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.from;

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password) return toast.error('Fill all fields');
    setLoading(true);
    try {
      const res = await authAPI.register(form);
      const parsed = parseAuthResponse(res);
      if (!parsed) {
        toast.error('Unexpected response from server. Check API version.');
        return;
      }
      const { token, userData } = parsed;
      login(userData, token);
      toast.success('Account created!');
      if (userData.role === 'Vendor' && userData.status === 'Pending') {
        toast('Your vendor account is pending admin approval.', { icon: '⏳' });
        logout();
        navigate('/login');
      } else {
        const routes = { Admin: '/admin', Vendor: '/vendor', Customer: '/shop' };
        const home = routes[userData.role] || '/shop';
        const canUseReturn =
          typeof returnTo === 'string' &&
          returnTo.startsWith('/') &&
          !returnTo.startsWith('/login') &&
          !returnTo.startsWith('/register');
        if (userData.role === 'Customer' && canUseReturn) navigate(returnTo, { replace: true });
        else navigate(home, { replace: true });
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err) || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={authStyles.page}>
      <div style={authStyles.box}>
        <div style={authStyles.logo}>Vendor<span style={{ color: 'var(--accent)' }}>Hub</span></div>
        <div style={authStyles.sub}>Create your account</div>

        <div className="form-group">
          <label>Full Name</label>
          <input className="input" placeholder="John Doe" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input className="input" type="email" placeholder="you@email.com" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input className="input" type="password" placeholder="••••••••" value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>Account Type</label>
          <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
            <option value="Customer">Customer</option>
            <option value="Vendor">Vendor</option>
          </select>
        </div>

        {form.role === 'Vendor' && (
          <div style={{ background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
            ⏳ Vendor accounts require admin approval before you can add products.
          </div>
        )}

        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px' }}
          onClick={handleSubmit} disabled={loading}>
          {loading ? 'Creating account...' : 'Create Account →'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" state={location.state} style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}
