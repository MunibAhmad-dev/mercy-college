// Auth guard
const currentUser = Store.getCurrentUser();
if (!currentUser) {
  window.location.href = 'signin.html';
}

if (currentUser) {
  document.getElementById('userName').textContent = currentUser.name;
  document.getElementById('userEmailMini').textContent = currentUser.email;
  document.getElementById('acc-name').textContent = currentUser.name;
  document.getElementById('acc-cnic').textContent = currentUser.cnic;
  document.getElementById('acc-phone').textContent = currentUser.phone;
  document.getElementById('acc-email').textContent = currentUser.email;
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  Store.signOut();
  window.location.href = 'signin.html';
});

// Sidebar navigation
const dashNavLinks = document.querySelectorAll('.dash-nav-link');
const dashViews = document.querySelectorAll('.dash-view');
dashNavLinks.forEach(link => {
  link.addEventListener('click', () => {
    dashNavLinks.forEach(l => l.classList.remove('active'));
    dashViews.forEach(v => v.classList.remove('active'));
    link.classList.add('active');
    document.getElementById('view-' + link.dataset.view).classList.add('active');
  });
});

function filesToRecords(fileList) {
  const files = Array.from(fileList || []);
  return Promise.all(files.map(file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, dataUrl: reader.result });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  })));
}

function statusStageIndex(app) {
  if (!app) return 0;
  if (app.status === 'Merit Result Declared') return 3;
  if (app.verified) return 2;
  return 1;
}

function renderStepper(app) {
  const steps = ['Account Created', 'Application Submitted', 'Verified', 'Merit Result & Allocation'];
  const stage = statusStageIndex(app);
  const stepper = document.getElementById('statusStepper');
  stepper.innerHTML = steps.map((label, i) => {
    let cls = '';
    const isDone = i < stage || (i === stage && i === steps.length - 1);
    if (isDone) cls = 'done';
    else if (i === stage) cls = 'active';
    return `
      <div class="status-step ${cls}">
        <div class="status-step-dot">${isDone ? '&#10003;' : i + 1}</div>
        <p>${label}</p>
      </div>`;
  }).join('');
}

function renderAllocationBanner(app) {
  const el = document.getElementById('allocationBanner');
  if (!app || app.status !== 'Merit Result Declared') {
    el.innerHTML = '';
    return;
  }
  if (app.allocation === 'Allocated') {
    el.innerHTML = `
      <div class="allocation-banner success">
        <h3>🎉 Congratulations, ${currentUser.name}!</h3>
        <p>You have been allocated a seat in <strong>${app.program}</strong> (Merit Rank #${app.meritRank}). Our admissions office will contact you with next steps.</p>
      </div>`;
  } else {
    el.innerHTML = `
      <div class="allocation-banner fail">
        <h3>Merit Result Declared</h3>
        <p>Unfortunately you were not allocated a seat in <strong>${app.program}</strong> in this round (Merit Rank #${app.meritRank}). Please contact the admissions office regarding the next merit list.</p>
      </div>`;
  }
}

function statusBadgeMarkup(app) {
  if (app.status === 'Merit Result Declared') {
    return app.allocation === 'Allocated'
      ? '<span class="status-badge allocated">Allocated</span>'
      : '<span class="status-badge not-allocated">Not Allocated</span>';
  }
  if (app.verified) return '<span class="status-badge verified">Verified</span>';
  return '<span class="status-badge submitted">Submitted &mdash; Under Review</span>';
}

function renderApplicationArea() {
  const app = Store.getApplicationByUser(currentUser.id);
  const area = document.getElementById('applicationArea');
  area.innerHTML = '';

  renderStepper(app);
  renderAllocationBanner(app);

  if (!app) {
    const tpl = document.getElementById('applicationFormTemplate').content.cloneNode(true);
    tpl.querySelector('.applicant-email').textContent = currentUser.email;
    area.appendChild(tpl);
    wireApplicationForm();
    return;
  }

  const tpl = document.getElementById('applicationSummaryTemplate').content.cloneNode(true);
  tpl.querySelector('.status-badge').outerHTML = statusBadgeMarkup(app);
  tpl.querySelector('.submitted-date').textContent = new Date(app.submittedAt).toLocaleDateString();
  tpl.querySelector('.s-name').textContent = currentUser.name;
  tpl.querySelector('.s-father').textContent = app.father;
  tpl.querySelector('.s-cnic').textContent = app.cnic;
  tpl.querySelector('.s-dob').textContent = app.dob;
  tpl.querySelector('.s-gender').textContent = app.gender;
  tpl.querySelector('.s-phone').textContent = currentUser.phone;
  tpl.querySelector('.s-email').textContent = currentUser.email;
  tpl.querySelector('.s-program').textContent = app.program;
  tpl.querySelector('.s-qualification').textContent = app.qualification;
  tpl.querySelector('.s-marksMatric').textContent = app.marksMatric;
  tpl.querySelector('.s-marksFsc').textContent = app.marksFsc || '—';
  tpl.querySelector('.s-address').textContent = app.address;

  area.appendChild(tpl);

  const docsWrap = document.getElementById('summaryDocs');
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
}

function wireApplicationForm() {
  const form = document.getElementById('applicationForm');
  const errorEl = document.getElementById('appFormError');
  const submitBtn = document.getElementById('appSubmitBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.remove('visible');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading documents...';

    try {
      const f = form;
      const [cnicFormB, domicile, matricDocs, fscDocs, kmuCat] = await Promise.all([
        filesToRecords(f.cnicFormB.files),
        filesToRecords(f.domicile.files),
        filesToRecords(f.matricDocs.files),
        filesToRecords(f.fscDocs.files),
        filesToRecords(f.kmuCat.files),
      ]);

      const fields = {
        father: f.father.value.trim(),
        cnic: f.cnic.value.trim(),
        dob: f.dob.value,
        gender: f.gender.value,
        qualification: f.qualification.value,
        program: f.program.value,
        marksMatric: f.marksMatric.value.trim(),
        marksFsc: f.marksFsc.value.trim(),
        address: f.address.value.trim(),
        documents: { cnicFormB, domicile, matricDocs, fscDocs, kmuCat },
      };

      // TODO: replace with fetch('/api/applications', { method:'POST', body: formData })
      Store.submitApplication(currentUser.id, fields);
      renderApplicationArea();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      errorEl.textContent = 'Something went wrong while uploading your documents. Please try again.';
      errorEl.classList.add('visible');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Application';
    }
  });
}

if (currentUser) {
  renderApplicationArea();
}
