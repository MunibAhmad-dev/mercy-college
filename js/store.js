/**
 * DEMO DATA LAYER -- browser localStorage only.
 *
 * This simulates the student accounts / applications / merit workflow so the
 * frontend can be built and clicked through end-to-end before the real
 * Express + database backend exists. It is NOT secure (passwords are stored
 * in plain text in the browser) and is NOT shared between devices/users.
 *
 * To go live: replace the body of each Store method below with a fetch()
 * call to your real Express API (e.g. POST /api/auth/signup,
 * POST /api/auth/signin, POST /api/applications, GET /api/admin/applications,
 * POST /api/admin/applications/:id/verify, POST /api/admin/merit). Keep the
 * method names/signatures the same and every page that calls Store.* keeps
 * working unchanged.
 */

const DB_KEYS = {
  USERS: 'mcn_users',
  SESSION: 'mcn_session',
  APPLICATIONS: 'mcn_applications',
  ADMIN_SESSION: 'mcn_admin_session',
};

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

const Store = {
  // ===================== Student auth =====================
  getUsers() {
    return readJSON(DB_KEYS.USERS, []);
  },

  findUserByEmail(email) {
    return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  },

  signUp({ name, cnic, email, phone, password }) {
    if (this.findUserByEmail(email)) {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }
    const users = this.getUsers();
    const user = { id: 'u_' + Date.now(), name, cnic, email, phone, password };
    users.push(user);
    writeJSON(DB_KEYS.USERS, users);
    this.setSession(user.id);
    return user;
  },

  signIn(email, password) {
    const user = this.findUserByEmail(email);
    if (!user || user.password !== password) {
      throw new Error('Incorrect email or password.');
    }
    this.setSession(user.id);
    return user;
  },

  setSession(userId) {
    writeJSON(DB_KEYS.SESSION, { userId });
  },

  getSession() {
    return readJSON(DB_KEYS.SESSION, null);
  },

  getCurrentUser() {
    const session = this.getSession();
    if (!session) return null;
    return this.getUsers().find(u => u.id === session.userId) || null;
  },

  signOut() {
    localStorage.removeItem(DB_KEYS.SESSION);
  },

  // ===================== Applications =====================
  getApplications() {
    return readJSON(DB_KEYS.APPLICATIONS, []);
  },

  getApplicationByUser(userId) {
    return this.getApplications().find(a => a.userId === userId) || null;
  },

  submitApplication(userId, fields) {
    const apps = this.getApplications();
    const idx = apps.findIndex(a => a.userId === userId);
    const record = {
      id: idx > -1 ? apps[idx].id : 'app_' + Date.now(),
      userId,
      ...fields,
      status: 'Submitted',
      verified: false,
      allocation: null,
      meritRank: null,
      submittedAt: new Date().toISOString(),
    };
    if (idx > -1) apps[idx] = record; else apps.push(record);
    writeJSON(DB_KEYS.APPLICATIONS, apps);
    return record;
  },

  // ===================== Admin =====================
  // DEMO credentials only -- replace with real server-side auth before launch.
  ADMIN_CREDENTIALS: { username: 'admin', password: 'admin123' },

  adminSignIn(username, password) {
    if (username !== this.ADMIN_CREDENTIALS.username || password !== this.ADMIN_CREDENTIALS.password) {
      throw new Error('Invalid admin username or password.');
    }
    writeJSON(DB_KEYS.ADMIN_SESSION, { loggedIn: true, at: Date.now() });
  },

  isAdminLoggedIn() {
    return !!readJSON(DB_KEYS.ADMIN_SESSION, null);
  },

  adminSignOut() {
    localStorage.removeItem(DB_KEYS.ADMIN_SESSION);
  },

  verifyApplication(id, verified) {
    const apps = this.getApplications();
    const app = apps.find(a => a.id === id);
    if (app) {
      app.verified = verified;
      if (app.status === 'Submitted' || app.status === 'Verified') {
        app.status = verified ? 'Verified' : 'Submitted';
      }
      writeJSON(DB_KEYS.APPLICATIONS, apps);
    }
    return app;
  },

  deleteApplication(id) {
    writeJSON(DB_KEYS.APPLICATIONS, this.getApplications().filter(a => a.id !== id));
  },

  // Ranks verified applicants for a program by marks (highest first) and
  // marks the top `seats` as Allocated, the rest as Not Allocated.
  runMerit(program, seats) {
    const all = this.getApplications();
    const parseMarks = a => {
      const m = String(a.marksFsc || a.marksMatric || '').match(/[\d.]+/);
      return m ? parseFloat(m[0]) : 0;
    };
    const pool = all
      .filter(a => a.program === program && a.verified)
      .sort((a, b) => parseMarks(b) - parseMarks(a));

    pool.forEach((a, i) => {
      const target = all.find(x => x.id === a.id);
      target.meritRank = i + 1;
      target.allocation = i < seats ? 'Allocated' : 'Not Allocated';
      target.status = 'Merit Result Declared';
    });

    writeJSON(DB_KEYS.APPLICATIONS, all);
    return pool;
  },
};
