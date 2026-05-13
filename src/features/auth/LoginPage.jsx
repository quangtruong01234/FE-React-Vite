import { useLogin } from './useLogin.js';
import './Login.css';

export default function LoginPage({ onLoginSuccess }) {
  const { form, errors, loading, apiError, showPassword, handleChange, handleSubmit, togglePassword } = useLogin(onLoginSuccess);

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M6 8h20l-2 12H8L6 8z" fill="white" opacity="0.9"/>
            <circle cx="12" cy="22" r="2" fill="white"/>
            <circle cx="22" cy="22" r="2" fill="white"/>
            <path d="M3 5h3l1 3" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>

        <h1 className="login-title">TryBuy</h1>
        <p className="login-subtitle">Đăng nhập để khám phá hàng ngàn sản phẩm</p>

        {apiError && (
          <div className="login-api-error">{apiError}</div>
        )}

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-field">
            <label className="login-label" htmlFor="username">Tên đăng nhập</label>
            <input
              id="username"
              name="username"
              type="text"
              className={`login-input${errors.username ? ' login-input--error' : ''}`}
              placeholder="Nhập tên đăng nhập"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              autoFocus
            />
            {errors.username && <span className="login-field-error">{errors.username}</span>}
          </div>

          <div className="login-field">
            <div className="login-label-row">
              <label className="login-label" htmlFor="password">Mật khẩu</label>
              <button type="button" className="login-forgot">Quên mật khẩu?</button>
            </div>
            <div className="login-password-wrap">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className={`login-input login-input--password${errors.password ? ' login-input--error' : ''}`}
                placeholder="Nhập mật khẩu"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-eye"
                onClick={togglePassword}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
            {errors.password && <span className="login-field-error">{errors.password}</span>}
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? <span className="login-spinner" /> : 'Đăng nhập'}
          </button>
        </form>

        <p className="login-register">
          Chưa có tài khoản?{' '}
          <button type="button" className="login-register-link">Đăng ký</button>
        </p>
      </div>
    </div>
  );
}
