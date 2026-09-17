const PROGRAM_LABELS = {
  BSN: 'BSN — Generic Nursing',
  LHV: 'LHV — Lady Health Visitor',
};

// Auth guard
if (!Store.isAdminLoggedIn()) {
  window.location.href = 'login.html';
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  Store.adminSignOut();
  window.location.href = 'login.html';
});

function pct(marks) {
  return (marks === null || marks === undefined || marks === '') ? '—' : marks;
}

function statusBadgeMarkup(app) {
  const s = (app.status || '').toLowerCase();
  let cls = 'submitted';
  if (s.includes('reject') || (s.includes('not') && s.includes('allocat'))) cls = 'not-allocated';
  else if (s.includes('allocat')) cls = 'allocated';
  else if (s.includes('verif')) cls = 'verified';
  const label = app.status ? app.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Pending';
  return `<span class="status-badge ${cls}">${label}</span>`;
}

// ===================== Mobile sidebar toggle =====================
const dashSidebar = document.getElementById('dashSidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarBackdrop = document.getElementById('sidebarBackdrop');
function closeSidebar() {
  dashSidebar.classList.remove('open');
  sidebarBackdrop.classList.remove('open');
}
if (sidebarToggle) {
  sidebarToggle.addEventListener('click', () => {
    dashSidebar.classList.toggle('open');
    sidebarBackdrop.classList.toggle('open');
  });
}
if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);

// ===================== Sidebar navigation =====================
const navLinks = document.querySelectorAll('.dash-nav-link');
const views = document.querySelectorAll('.dash-view');
navLinks.forEach(link => {
  link.addEventListener('click', () => {
    navLinks.forEach(l => l.classList.remove('active'));
    views.forEach(v => v.classList.remove('active'));
    link.classList.add('active');
    document.getElementById('view-' + link.dataset.view).classList.add('active');
    if (link.dataset.view === 'applications') renderApplications();
    closeSidebar();
  });
});

// ===================== Applications table =====================
let currentApplications = [];

function renderStats(stats, fallbackCount) {
  const wrap = document.getElementById('adminStats');
  if (stats && typeof stats === 'object') {
    wrap.innerHTML = Object.entries(stats).map(([label, value]) => `
      <div class="admin-stat"><strong>${value}</strong><span>${label.replace(/_/g, ' ')}</span></div>
    `).join('');
  } else {
    wrap.innerHTML = `<div class="admin-stat"><strong>${fallbackCount}</strong><span>Total</span></div>`;
  }
}

async function renderApplications() {
  const tbody = document.getElementById('applicationsTableBody');
  const emptyEl = document.getElementById('applicationsEmpty');

  try {
    const [stats, apps] = await Promise.all([
      Store.adminGetStats().catch(() => null),
      Store.adminGetApplications(),
    ]);
    currentApplications = Array.isArray(apps) ? apps : (apps && apps.applications) || [];
    renderStats(stats, currentApplications.length);
  } catch (err) {
    tbody.innerHTML = '';
    emptyEl.style.display = 'block';
    emptyEl.textContent = `Could not load applications: ${err.message}`;
    return;
  }

  if (currentApplications.length === 0) {
    tbody.innerHTML = '';
    emptyEl.style.display = 'block';
    emptyEl.textContent = 'No applications submitted yet.';
    return;
  }
  emptyEl.style.display = 'none';

  tbody.innerHTML = currentApplications.map(app => `
    <tr>
      <td>${app.user?.name || app.father_name || '—'}</td>
      <td>${app.user?.cnic || '—'}</td>
      <td>${PROGRAM_LABELS[app.program] || app.program || '—'}</td>
      <td>${pct(app.marks_matric)}</td>
      <td>${pct(app.marks_fsc)}</td>
      <td>${statusBadgeMarkup(app)}</td>
      <td>${app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : '—'}</td>
      <td><button class="btn btn-tiny btn-primary" data-view-id="${app.id}">View / Manage</button></td>
    </tr>`).join('');

  tbody.querySelectorAll('[data-view-id]').forEach(btn => {
    btn.addEventListener('click', () => openDetailModal(btn.dataset.viewId));
  });
}

// ===================== Detail modal =====================
const detailModal = document.getElementById('detailModal');
let activeApplicationId = null;

async function openDetailModal(appId) {
  activeApplicationId = appId;
  document.getElementById('detailSummary').innerHTML = '<div class="summary-item"><span>Loading...</span></div>';
  document.getElementById('detailDocs').innerHTML = '';
  document.getElementById('detailProfilePic').removeAttribute('src');
  document.getElementById('statusFormError').classList.remove('visible');
  // Reset credentials panel
  const credBox = document.getElementById('credentialsBox');
  credBox.style.display = 'none';
  credBox.innerHTML = '';
  document.getElementById('viewCredentialsBtn').textContent = 'View Credentials';
  detailModal.classList.add('open');

  let app;
  try {
    app = await Store.adminGetApplication(appId);
  } catch (err) {
    document.getElementById('detailSummary').innerHTML = `<p class="auth-error visible">Could not load this application: ${err.message}</p>`;
    return;
  }
  if (!app) return;

  const rows = [
    ['Full Name', app.user?.name],
    ["Father's / Guardian's Name", app.father_name],
    ['CNIC / Form-B Number', app.cnic_number],
    ['Account CNIC', app.user?.cnic],
    ['Date of Birth', app.dob],
    ['Gender', app.gender],
    ['Phone', app.user?.phone],
    ['Email', app.user?.email],
    ['Address', app.address],
    ['Program of Interest', PROGRAM_LABELS[app.program] || app.program],
    ['Previous Qualification', app.qualification],
    ['Matric Marks (%)', pct(app.marks_matric)],
    ['F.Sc Marks (%)', app.marks_fsc != null ? pct(app.marks_fsc) : '—'],
    ['Application Status', app.status ? app.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Pending'],
    ['Merit Rank', app.merit_rank ?? '—'],
    ['Admin Note', app.admin_note || '—'],
    ['Submitted At', app.submitted_at ? new Date(app.submitted_at).toLocaleString() : '—'],
    ['Application ID', app.id],
  ];
  document.getElementById('detailSummary').innerHTML = rows.map(([label, value]) => `
    <div class="summary-item"><span>${label}</span><strong>${value !== undefined && value !== null ? value : '—'}</strong></div>
  `).join('');

  if (app.profile_picture) {
    Store.adminGetFileUrl(app.profile_picture).then(res => {
      if (res) document.getElementById('detailProfilePic').src = res.url;
    });
  }

  const docsWrap = document.getElementById('detailDocs');
  const docEntries = [
    ...(app.cnic_front ? [{ label: 'CNIC Front', filename: app.cnic_front }] : []),
    ...(app.cnic_back ? [{ label: 'CNIC Back', filename: app.cnic_back }] : []),
    ...(app.domicile_doc ? [{ label: 'Domicile', filename: app.domicile_doc }] : []),
    ...Store.parseFilenameList(app.matric_docs).map(f => ({ label: 'Matric', filename: f })),
    ...Store.parseFilenameList(app.fsc_docs).map(f => ({ label: 'F.Sc', filename: f })),
    ...(app.kmu_cat_doc ? [{ label: 'KMU CAT', filename: app.kmu_cat_doc }] : []),
  ];
  if (docEntries.length === 0) {
    docsWrap.innerHTML = '<span class="file-chip">No documents uploaded</span>';
  }
  docEntries.forEach(({ label, filename }) => {
    Store.adminGetFileUrl(filename).then(res => {
      if (!res) return;
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:inline-flex;flex-direction:column;align-items:center;gap:4px;margin:4px;vertical-align:top;';
      if (res.isImage) {
        const img = document.createElement('img');
        img.src = res.url;
        img.alt = label;
        img.title = label;
        img.style.cssText = 'max-width:120px;max-height:120px;border-radius:6px;border:1px solid #ddd;cursor:pointer;';
        img.addEventListener('click', () => window.open(res.url, '_blank'));
        wrap.appendChild(img);
      }
      const btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:4px;';
      const viewBtn = document.createElement('a');
      viewBtn.href = res.url;
      viewBtn.target = '_blank';
      viewBtn.rel = 'noopener';
      viewBtn.className = 'btn btn-tiny btn-ghost-dark';
      viewBtn.textContent = label;
      btnRow.appendChild(viewBtn);
      // Download via re-fetch with download flag
      const dlBtn = document.createElement('button');
      dlBtn.type = 'button';
      dlBtn.className = 'btn btn-tiny btn-ghost-dark';
      dlBtn.textContent = '⬇';
      dlBtn.title = `Download ${label}`;
      dlBtn.addEventListener('click', () => {
        const a = document.createElement('a');
        a.href = res.url;
        a.download = filename;
        a.click();
      });
      btnRow.appendChild(dlBtn);
      wrap.appendChild(btnRow);
      docsWrap.appendChild(wrap);
    });
  });

  document.getElementById('statusInput').value = app.status || '';
  document.getElementById('adminNoteInput').value = app.admin_note || '';
}

document.getElementById('refreshAppsBtn').addEventListener('click', renderApplications);
document.getElementById('detailModalClose').addEventListener('click', () => detailModal.classList.remove('open'));
detailModal.addEventListener('click', (e) => { if (e.target === detailModal) detailModal.classList.remove('open'); });

document.querySelectorAll('.status-quick-picks [data-status]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('statusInput').value = btn.dataset.status;
  });
});

document.getElementById('statusForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('statusFormError');
  errorEl.classList.remove('visible');
  const submitBtn = document.getElementById('statusSubmitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  try {
    const status = document.getElementById('statusInput').value.trim();
    const note = document.getElementById('adminNoteInput').value.trim();
    await Store.adminUpdateStatus(activeApplicationId, status, note);
    detailModal.classList.remove('open');
    await renderApplications();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.add('visible');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Status';
  }
});

// ===================== Credentials viewer =====================
document.getElementById('viewCredentialsBtn').addEventListener('click', async () => {
  const credBox = document.getElementById('credentialsBox');
  const btn = document.getElementById('viewCredentialsBtn');
  if (credBox.style.display !== 'none') {
    credBox.style.display = 'none';
    btn.textContent = 'View Credentials';
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Loading...';
  try {
    // Get the app to extract user id (user.id is always in the response)
    const app = await Store.adminGetApplication(activeApplicationId);
    const creds = await Store.adminGetCredentials(app.user?.id || app.user_id);
    const pwDisplay = creds.password_plain
      ? `<strong style="font-family:monospace;">${creds.password_plain}</strong>`
      : `<span style="color:#999;font-size:0.82rem;">Not stored — use Reset below to set one</span>`;

    credBox.innerHTML = `
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:4px 8px;color:var(--muted,#888);white-space:nowrap;">Name</td><td style="padding:4px 8px;"><strong>${creds.name || '—'}</strong></td></tr>
        <tr><td style="padding:4px 8px;color:var(--muted,#888);white-space:nowrap;">Email</td><td style="padding:4px 8px;"><strong>${creds.email || '—'}</strong></td></tr>
        <tr><td style="padding:4px 8px;color:var(--muted,#888);white-space:nowrap;">Phone</td><td style="padding:4px 8px;"><strong>${creds.phone || '—'}</strong></td></tr>
        <tr><td style="padding:4px 8px;color:var(--muted,#888);white-space:nowrap;">CNIC</td><td style="padding:4px 8px;"><strong>${creds.cnic || '—'}</strong></td></tr>
        <tr><td style="padding:4px 8px;color:var(--muted,#888);white-space:nowrap;">Password</td><td style="padding:4px 8px;">${pwDisplay}</td></tr>
      </table>
      <p style="margin:10px 0 6px;font-size:0.8rem;color:var(--muted,#888);">Share only with the student for account recovery.</p>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px;">
        <input type="text" id="resetPwInput" placeholder="New password (min 6 chars)"
          style="flex:1;min-width:160px;padding:6px 10px;border:1px solid #ccc;border-radius:8px;font-size:0.85rem;">
        <button type="button" class="btn btn-tiny btn-primary" id="resetPwBtn">Reset Password</button>
      </div>
      <p id="resetPwMsg" style="margin:6px 0 0;font-size:0.82rem;display:none;"></p>`;

    // Wire the reset button (scoped inside the box)
    const resetBtn = credBox.querySelector('#resetPwBtn');
    const resetInput = credBox.querySelector('#resetPwInput');
    const resetMsg = credBox.querySelector('#resetPwMsg');
    resetBtn.addEventListener('click', async () => {
      const pw = resetInput.value.trim();
      if (pw.length < 6) { resetMsg.textContent = 'Password must be at least 6 characters.'; resetMsg.style.color = 'red'; resetMsg.style.display = 'block'; return; }
      resetBtn.disabled = true; resetBtn.textContent = 'Saving...';
      try {
        const app = await Store.adminGetApplication(activeApplicationId);
        await Store.adminResetPassword(app.user?.id || app.user_id, pw);
        resetMsg.textContent = `Password updated to: ${pw}`;
        resetMsg.style.color = 'green';
        resetMsg.style.display = 'block';
        resetInput.value = '';
      } catch (err) {
        resetMsg.textContent = err.message;
        resetMsg.style.color = 'red';
        resetMsg.style.display = 'block';
      } finally {
        resetBtn.disabled = false; resetBtn.textContent = 'Reset Password';
      }
    });
    credBox.style.display = 'block';
    btn.textContent = 'Hide Credentials';
  } catch (err) {
    credBox.innerHTML = `<span style="color:red;">Could not load credentials: ${err.message}</span>`;
    credBox.style.display = 'block';
    btn.textContent = 'View Credentials';
  } finally {
    btn.disabled = false;
  }
});

// ===================== Merit list =====================
document.getElementById('runMeritBtn').addEventListener('click', async () => {
  const program = document.getElementById('meritProgram').value;
  const seats = parseInt(document.getElementById('meritSeats').value, 10) || 0;
  const wrap = document.getElementById('meritResultsWrap');
  const errorEl = document.getElementById('meritError');
  errorEl.classList.remove('visible');
  wrap.innerHTML = '<div class="empty-state">Loading merit list...</div>';

  try {
    const result = await Store.adminGetMeritList(program, seats);
    const list = Array.isArray(result) ? result : (result && (result.list || result.applications)) || null;

    if (!list || list.length === 0) {
      wrap.innerHTML = '<div class="empty-state">No verified applicants found for this program yet.</div>';
      return;
    }

    // Build table columns dynamically from whatever fields the API returns.
    const preferredOrder = ['rank', 'merit_rank', 'name', 'cnic', 'marks_matric', 'marks_fsc', 'program', 'status', 'allocation'];
    const keys = Object.keys(list[0]);
    keys.sort((a, b) => {
      const ai = preferredOrder.indexOf(a), bi = preferredOrder.indexOf(b);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

    const thead = `<tr>${keys.map(k => `<th>${k.replace(/_/g, ' ')}</th>`).join('')}</tr>`;
    const tbody = list.map(row => `<tr>${keys.map(k => `<td>${row[k] ?? '—'}</td>`).join('')}</tr>`).join('');
    wrap.innerHTML = `<table class="admin-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
  } catch (err) {
    wrap.innerHTML = '';
    errorEl.textContent = `Could not load the merit list: ${err.message}`;
    errorEl.classList.add('visible');
  }
});

// ===================== Settings — delete all data =====================
document.getElementById('loadDeleteStatsBtn').addEventListener('click', async () => {
  const statsEl = document.getElementById('deleteDataStats');
  const deleteBtn = document.getElementById('deleteAllDataBtn');
  const errorEl = document.getElementById('deleteDataError');
  errorEl.classList.remove('visible');
  statsEl.textContent = 'Loading...';
  deleteBtn.disabled = true;
  try {
    const stats = await Store.adminGetDataStats();
    const lines = Object.entries(stats || {})
      .map(([k, v]) => `${v} ${k.replace(/_/g, ' ')}`)
      .join(' · ');
    statsEl.textContent = lines || 'No data found.';
    deleteBtn.disabled = false;
  } catch (err) {
    statsEl.textContent = '';
    errorEl.textContent = `Could not load stats: ${err.message}`;
    errorEl.classList.add('visible');
  }
});

document.getElementById('deleteAllDataBtn').addEventListener('click', async () => {
  const confirmed = window.confirm(
    'Are you absolutely sure?\n\nThis will permanently delete ALL student applications and uploaded documents.\nAdmin accounts will be kept.\n\nThis cannot be undone.'
  );
  if (!confirmed) return;

  const deleteBtn = document.getElementById('deleteAllDataBtn');
  const loadBtn = document.getElementById('loadDeleteStatsBtn');
  const errorEl = document.getElementById('deleteDataError');
  const successEl = document.getElementById('deleteDataSuccess');
  const statsEl = document.getElementById('deleteDataStats');
  errorEl.classList.remove('visible');
  successEl.style.display = 'none';
  deleteBtn.disabled = true;
  deleteBtn.textContent = 'Deleting...';

  try {
    await Store.adminDeleteAllData();
    statsEl.textContent = '';
    successEl.style.display = 'block';
    loadBtn.disabled = false;
    deleteBtn.textContent = 'Delete All Data';
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.add('visible');
    deleteBtn.disabled = false;
    deleteBtn.textContent = 'Delete All Data';
  }
});

renderApplications();
