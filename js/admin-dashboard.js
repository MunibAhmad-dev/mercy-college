// Auth guard
if (!Store.isAdminLoggedIn()) {
  window.location.href = 'login.html';
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  Store.adminSignOut();
  window.location.href = 'login.html';
});

function getUserById(id) {
  return Store.getUsers().find(u => u.id === id) || {};
}

function pct(marks) {
  if (!marks) return '—';
  return marks;
}

function statusBadgeMarkup(app) {
  if (app.status === 'Merit Result Declared') {
    return app.allocation === 'Allocated'
      ? '<span class="status-badge allocated">Allocated</span>'
      : '<span class="status-badge not-allocated">Not Allocated</span>';
  }
  if (app.verified) return '<span class="status-badge verified">Verified</span>';
  return '<span class="status-badge submitted">Submitted</span>';
}

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
  });
});

// ===================== Applications table =====================
function renderStats(apps) {
  const stats = [
    { label: 'Total', value: apps.length },
    { label: 'Submitted', value: apps.filter(a => !a.verified).length },
    { label: 'Verified', value: apps.filter(a => a.verified).length },
    { label: 'Merit Declared', value: apps.filter(a => a.status === 'Merit Result Declared').length },
  ];
  document.getElementById('adminStats').innerHTML = stats.map(s => `
    <div class="admin-stat"><strong>${s.value}</strong><span>${s.label}</span></div>
  `).join('');
}

function renderApplications() {
  const apps = Store.getApplications();
  renderStats(apps);

  const tbody = document.getElementById('applicationsTableBody');
  const emptyEl = document.getElementById('applicationsEmpty');

  if (apps.length === 0) {
    tbody.innerHTML = '';
    emptyEl.style.display = 'block';
    return;
  }
  emptyEl.style.display = 'none';

  tbody.innerHTML = apps.map(app => {
    const user = getUserById(app.userId);
    return `
      <tr>
        <td>${user.name || '—'}</td>
        <td>${app.cnic || '—'}</td>
        <td>${app.program || '—'}</td>
        <td>${pct(app.marksMatric)}</td>
        <td>${pct(app.marksFsc)}</td>
        <td>${statusBadgeMarkup(app)}</td>
        <td>${new Date(app.submittedAt).toLocaleDateString()}</td>
        <td>
          <button class="btn btn-tiny btn-ghost-dark" data-view="${app.id}">View</button>
          <button class="btn btn-tiny ${app.verified ? 'btn-ghost-dark' : 'btn-primary'}" data-verify="${app.id}">${app.verified ? 'Unverify' : 'Verify'}</button>
          <button class="btn btn-tiny btn-accent" data-delete="${app.id}">Delete</button>
        </td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => openDetailModal(btn.dataset.view));
  });
  tbody.querySelectorAll('[data-verify]').forEach(btn => {
    btn.addEventListener('click', () => {
      const app = Store.getApplications().find(a => a.id === btn.dataset.verify);
      Store.verifyApplication(btn.dataset.verify, !app.verified);
      renderApplications();
    });
  });
  tbody.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Delete this application? This cannot be undone.')) {
        Store.deleteApplication(btn.dataset.delete);
        renderApplications();
      }
    });
  });
}

// ===================== Detail modal =====================
const detailModal = document.getElementById('detailModal');

function openDetailModal(appId) {
  const app = Store.getApplications().find(a => a.id === appId);
  if (!app) return;
  const user = getUserById(app.userId);

  const rows = [
    ['Full Name', user.name], ["Father's/Guardian's Name", app.father],
    ['CNIC / B-Form', app.cnic], ['Date of Birth', app.dob],
    ['Gender', app.gender], ['Phone', user.phone],
    ['Email', user.email], ['Program of Interest', app.program],
    ['Previous Qualification', app.qualification], ['Matric Marks', app.marksMatric],
    ['F.Sc Marks', app.marksFsc || '—'], ['Address', app.address],
  ];
  document.getElementById('detailSummary').innerHTML = rows.map(([label, value]) => `
    <div class="summary-item"><span>${label}</span><strong>${value || '—'}</strong></div>
  `).join('');

  const docsWrap = document.getElementById('detailDocs');
  docsWrap.innerHTML = '';
  const docGroups = app.documents || {};
  Object.values(docGroups).flat().forEach(doc => {
    if (!doc) return;
    if (doc.type && doc.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = doc.dataUrl;
      img.alt = doc.name;
      img.title = doc.name;
      docsWrap.appendChild(img);
    } else {
      const chip = document.createElement('span');
      chip.className = 'file-chip';
      chip.textContent = doc.name;
      docsWrap.appendChild(chip);
    }
  });
  if (!docsWrap.children.length) {
    docsWrap.innerHTML = '<span class="file-chip">No documents uploaded</span>';
  }

  detailModal.classList.add('open');
}

document.getElementById('detailModalClose').addEventListener('click', () => detailModal.classList.remove('open'));
detailModal.addEventListener('click', (e) => { if (e.target === detailModal) detailModal.classList.remove('open'); });

// ===================== Merit list =====================
document.getElementById('runMeritBtn').addEventListener('click', () => {
  const program = document.getElementById('meritProgram').value;
  const seats = parseInt(document.getElementById('meritSeats').value, 10) || 0;

  // TODO: replace with fetch('/api/admin/merit', { method:'POST', body: JSON.stringify({program, seats}) })
  const ranked = Store.runMerit(program, seats);

  const tbody = document.getElementById('meritTableBody');
  const emptyEl = document.getElementById('meritEmpty');

  if (ranked.length === 0) {
    tbody.innerHTML = '';
    emptyEl.style.display = 'block';
    emptyEl.textContent = 'No verified applicants found for this program yet.';
    return;
  }
  emptyEl.style.display = 'none';

  tbody.innerHTML = ranked.map(app => {
    const user = getUserById(app.userId);
    const full = Store.getApplications().find(a => a.id === app.id);
    return `
      <tr>
        <td>#${full.meritRank}</td>
        <td>${user.name || '—'}</td>
        <td>${app.cnic || '—'}</td>
        <td>${pct(app.marksMatric)}</td>
        <td>${pct(app.marksFsc)}</td>
        <td>${statusBadgeMarkup(full)}</td>
      </tr>`;
  }).join('');

  renderApplications();
});

renderApplications();
