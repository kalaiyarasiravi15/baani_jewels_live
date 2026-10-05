import { refreshSession } from '../sessionClient';
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { RiMailLine, RiLockPasswordLine, RiEyeLine, RiEyeOffLine } from 'react-icons/ri';
import { MdLogin } from 'react-icons/md';
import { API } from '../config';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.warning('Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(`${API}/admin/login`, { email: email.trim(), password });

      if (res.data.adminId) {
        await refreshSession();
        toast.success('✨ Login successful! Redirecting...', { autoClose: 1200 });
        setTimeout(() => {
          if (navigate) {
            navigate('/dashboard');
          } else {
            window.location.href = '/dashboard';
          }
        }, 400);
      }
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message || '';

      if (
        status === 404 ||
        message.toLowerCase().includes('email') ||
        message.toLowerCase().includes('user') ||
        message.toLowerCase().includes('not found')
      ) {
        toast.error('No account found with this email address.', { autoClose: 4000 });
      } else if (
        status === 401 ||
        message.toLowerCase().includes('password') ||
        message.toLowerCase().includes('invalid') ||
        message.toLowerCase().includes('incorrect')
      ) {
        toast.error('Incorrect password. Please try again.', { autoClose: 4000 });
      } else {
        toast.error(message || 'Login failed. Please try again.', { autoClose: 4000 });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-split-card">
        
        {/* Left Branding Panel (Image 3 Style) */}
        <div className="login-left-panel">
          <div className="brand-logo-text-wrap">
            <img 
              src="/admin_logo.jpeg" 
              alt="Baani Jewels Admin" 
              className="login-logo-img"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/logo_bani.png';
              }}
            />
          </div>
          <div className="brand-text-content">
            <span className="brand-subtitle">BAANI JEWELS</span>
            <h1 className="brand-title">Admin Panel</h1>
            <p className="brand-description">
              Secure access for managing products, orders, and customer enquiries.
            </p>
          </div>
        </div>

        {/* Right Form Panel (Clean luxury inputs with no inner borders) */}
        <div className="login-right-panel">
          <div className="form-header">
            <span className="form-subtitle">ADMIN LOGIN</span>
            <h2 className="form-title">Sign in to continue</h2>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            
            {/* Email Field */}
            <div className="input-group">
              <span className="input-icon-box" aria-hidden="true">
                <RiMailLine className="input-icon" />
              </span>
              <input
                type="email"
                className="bj-login-input login-field-input"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            {/* Password Field */}
            <div className="input-group">
              <span className="input-icon-box" aria-hidden="true">
                <RiLockPasswordLine className="input-icon" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                className="bj-login-input login-field-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={0}
              >
                {showPassword ? <RiEyeOffLine /> : <RiEyeLine />}
              </button>
            </div>

            {/* Login Action Button */}
            <button type="submit" className="login-action-btn" disabled={loading}>
              <MdLogin className="btn-icon" />
              <span>{loading ? 'Verifying...' : 'Login'}</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default Login;
