/**
 * Live data layer -- talks to the real Mercy College backend at API_BASE
 * (see js/config.js). Every method returns a Promise; callers must await it.
 *
 * Response shapes below were confirmed by hand against the live API:
 *   POST /auth/register, /auth/login  -> { success, token, user }
 *   GET  /student/me                  -> { success, data: user }
 *   GET  /student/application         -> { success, data: application|null }
 *   POST /student/application         -> { success, data: application }
 *   POST /student/profile-picture     -> { success, filename, url }
 *   GET  /uploads/:filename           -> raw file bytes (requires Bearer auth)
 * Admin GET endpoints (/admin/stats, /admin/applications, /admin/merit-list)
 * were not reachable without admin credentials, so they're assumed to follow
 * the same { success, data } convention every other endpoint uses. If any
 * admin call below throws about an unexpected shape, that's the place to fix.
 */

async function apiRequest(path, { method = 'GET', body, token, isForm = false, query } = {}) {
  let url = API(path);
  if (query) {
    const clean = Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '');
    const qs = new URLSearchParams(clean).toString();
    if (qs) url += `?${qs}`;
  }

  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !isForm) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: isForm ? body : (body ? JSON.stringify(body) : undefined),
    });
  } catch (err) {
    throw new Error('Could not reach the server. Please check your internet connection and try again.');
  }

  let json = null;
  try { json = await res.json(); } catch (e) { /* non-JSON response */ }

  if (!res.ok || (json && json.success === false)) {
    const message = (json && (json.error || json.message)) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return json || {};
}

// Uploaded files require a Bearer token, so <img src="..."> can't be used
// directly -- fetch the bytes ourselves and hand back an object URL plus
// whether it's an image (vs. a PDF, which should be linked, not <img>'d).
async function fetchProtectedFile(filename, token) {
  if (!filename || !token) return null;
  try {
    const res = await fetch(API(`/uploads/${encodeURIComponent(filename)}`), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return { url: URL.createObjectURL(blob), isImage: blob.type.startsWith('image/'), filename };
  } catch (e) {
    return null;
  }
}

// The backend stores multi-file fields (matric_docs, fsc_docs) as a JSON
// string, e.g. '["a.jpg","b.jpg"]'. Normalize to a plain array of filenames.
function parseFilenameList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [value];
  } catch (e) {
    return [value];
  }
}

const Store = {
  // ===================== Student auth =====================
  async signUp({ name, cnic, phone, email, password }) {
    const json = await apiRequest('/auth/register', { method: 'POST', body: { name, cnic, phone, email, password } });
    setToken(json.token);
    return json.user;
  },

  async signIn(email, password) {
    const json = await apiRequest('/auth/login', { method: 'POST', body: { email, password } });
    setToken(json.token);
    return json.user;
  },

  isSignedIn() {
    return !!getToken();
  },

  signOut() {
    clearToken();
  },

  async getCurrentUser() {
    const token = getToken();
    if (!token) return null;
    try {
      const json = await apiRequest('/student/me', { token });
      return json.data;
    } catch (e) {
      // Token missing/expired/invalid -- treat as signed out.
      clearToken();
      return null;
    }
  },

  // ===================== Application =====================
  async getApplication() {
    const json = await apiRequest('/student/application', { token: getToken() });
    return json.data || null;
  },

  // file: a single File object from <input type="file">
  async uploadProfilePicture(file) {
    const fd = new FormData();
    fd.append('profilePicture', file);
    return apiRequest('/student/profile-picture', { method: 'POST', body: fd, isForm: true, token: getToken() });
  },

  // fields: { father, dob, gender, qualification, program, marksMatric, marksFsc, address, cnicNumber }
  // files: { profilePicture:[File], cnicFront:[File], cnicBack:[File], domicile:[File], matricDocs:[File,...], fscDocs:[File,...], kmuCat:[File] }
  async submitApplication(fields, files) {
    const fd = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined && value !== null) fd.append(key, value);
    });
    Object.entries(files).forEach(([key, fileList]) => {
      (fileList || []).forEach(file => fd.append(key, file));
    });
    const json = await apiRequest('/student/application', { method: 'POST', body: fd, isForm: true, token: getToken() });
    return json.data;
  },

  parseFilenameList,

  getFileUrl(filename) {
    return fetchProtectedFile(filename, getToken());
  },

  // ===================== Admin =====================
  async adminSignIn(email, password) {
    const json = await apiRequest('/auth/admin-login', { method: 'POST', body: { email, password } });
    setAdminToken(json.token);
    return json.user || json.admin || null;
  },

  isAdminLoggedIn() {
    return !!getAdminToken();
  },

  adminSignOut() {
    clearAdminToken();
  },

  async adminGetStats() {
    const json = await apiRequest('/admin/stats', { token: getAdminToken() });
    return json.data;
  },

  // filters: { status, program, search, limit, offset }
  async adminGetApplications(filters = {}) {
    const json = await apiRequest('/admin/applications', { token: getAdminToken(), query: filters });
    return json.data;
  },

  async adminGetApplication(id) {
    const json = await apiRequest(`/admin/applications/${id}`, { token: getAdminToken() });
    return json.data;
  },

  async adminUpdateStatus(id, status, admin_note) {
    const json = await apiRequest(`/admin/applications/${id}/status`, {
      method: 'PUT',
      body: { status, admin_note },
      token: getAdminToken(),
    });
    return json.data;
  },

  async adminGetStatusHistory(id) {
    const json = await apiRequest(`/admin/applications/${id}/status-history`, { token: getAdminToken() });
    return json.data;
  },

  async adminGetCredentials(userId) {
    const json = await apiRequest(`/admin/students/${userId}/credentials`, { token: getAdminToken() });
    return json.data;
  },

  async adminResetPassword(userId, newPassword) {
    const json = await apiRequest(`/admin/students/${userId}/reset-password`, {
      method: 'POST',
      body: { new_password: newPassword },
      token: getAdminToken(),
    });
    return json;
  },

  async adminGetMeritList(program, seats) {
    const json = await apiRequest('/admin/merit-list', { token: getAdminToken(), query: { program, seats } });
    return json.data;
  },

  adminGetFileUrl(filename) {
    return fetchProtectedFile(filename, getAdminToken());
  },

  async adminGetDataStats() {
    const json = await apiRequest('/admin/data/stats', { token: getAdminToken() });
    return json.data;
  },

  async adminDeleteAllData() {
    // Backend requires x-confirm-delete header — use fetch directly
    const res = await fetch(API('/admin/data'), {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getAdminToken()}`,
        'x-confirm-delete': 'DELETE_ALL_MERCY',
      },
    });
    let data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok || (data && data.success === false)) {
      throw new Error((data && (data.error || data.message)) || `Delete failed (${res.status})`);
    }
    return data;
  },
};
