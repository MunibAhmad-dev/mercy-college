// Shared site contact/config constants -- used by the main site and the
// student/admin portal pages. Update these in one place.
const SITE_CONFIG = {
  whatsapp: '923429671520', // Principal, Muhammad Ali -- wa.me format (country code, no leading 0)
  whatsappDisplay: '+92 342 9671520',
  email: 'principal.mcn.edu@gmail.com',
};

// ─── Backend API ──────────────────────────────────────────────────────────────
// All Mercy College API calls go through this base URL.
// Change this one line when deploying to production.
//
//   Development:  http://localhost:5000
//   Production:   https://YOUR-SERVER-DOMAIN.com   ← replace this
//
const API_BASE = 'https://osatechcloud.cloud';

// Convenience: build an endpoint URL
// Usage: API('/mercy/auth/login')  →  'https://YOUR-SERVER-DOMAIN.com/api/mercy/auth/login'
function API(path) {
  return `${API_BASE}/api/mercy${path}`;
}

// Student and admin tokens are kept separate so an admin can be signed in on
// the same browser as a student session (or vice versa) without clobbering
// each other.
function getToken() {
  return localStorage.getItem('mcn_token') || '';
}
function setToken(token) {
  if (token) localStorage.setItem('mcn_token', token);
}
function clearToken() {
  localStorage.removeItem('mcn_token');
}

function getAdminToken() {
  return localStorage.getItem('mcn_admin_token') || '';
}
function setAdminToken(token) {
  if (token) localStorage.setItem('mcn_admin_token', token);
}
function clearAdminToken() {
  localStorage.removeItem('mcn_admin_token');
}

// Common headers for authenticated JSON requests. Pass the token explicitly
// (getToken() for student routes, getAdminToken() for admin routes).
function authHeaders(token, extra = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}
