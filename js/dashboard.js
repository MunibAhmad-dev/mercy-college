let currentUser = null;

const PROGRAM_LABELS = {
  BSN: 'BSN — Generic Nursing',
  LHV: 'LHV — Lady Health Visitor',
};

function filesToArray(fileList) {
  return Array.from(fileList || []);
}

// Shows thumbnail/file-chip previews under a file input as soon as files are chosen.
function wireUploadPreview(input, previewEl) {
  if (!input || !previewEl) return;
  input.addEventListener('change', () => {
    previewEl.innerHTML = '';
    filesToArray(input.files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          const img = document.createElement('img');
          img.src = reader.result;
          img.alt = file.name;
          img.title = file.name;
          previewEl.appendChild(img);
        };
        reader.readAsDataURL(file);
      } else {
        const chip = document.createElement('span');
        chip.className = 'file-chip';
        chip.textContent = file.name;
        previewEl.appendChild(chip);
      }
    });
  });
}

function statusStageIndex(app) {
  if (!app) return 0;
  const s = (app.status || '').toLowerCase();
  if (s.includes('allocat') || s.includes('merit') || s.includes('reject')) return 3;
  if (s.includes('verif')) return 2;
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
  const s = app ? (app.status || '').toLowerCase() : '';
  if (!app || !(s.includes('allocat') || s.includes('reject'))) {
    el.innerHTML = '';
    return;
  }
  const programLabel = PROGRAM_LABELS[app.program] || app.program;
  if (s.includes('reject') || (s.includes('not') && s.includes('allocat'))) {
    el.innerHTML = `
      <div class="allocation-banner fail">
        <h3>Application Update</h3>
        <p>Your application status for <strong>${programLabel}</strong> is: <strong>${app.status}</strong>. Please contact the admissions office for details.</p>
      </div>`;
  } else {
    el.innerHTML = `
      <div class="allocation-banner success">
        <h3>🎉 Congratulations, ${currentUser.name}!</h3>
        <p>You have been allocated a seat in <strong>${programLabel}</strong>${app.merit_rank ? ` (Merit Rank #${app.merit_rank})` : ''}. Our admissions office will contact you with next steps.</p>
      </div>`;
  }
}

function statusBadgeMarkup(app) {
  const s = (app.status || '').toLowerCase();
  let cls = 'submitted';
  if (s.includes('reject') || (s.includes('not') && s.includes('allocat'))) cls = 'not-allocated';
  else if (s.includes('allocat')) cls = 'allocated';
  else if (s.includes('verif')) cls = 'verified';
  const label = app.status ? app.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Submitted';
  return `<span class="status-badge ${cls}">${label}</span>`;
}

async function renderApplicationArea() {
  const area = document.getElementById('applicationArea');
  let app;
  try {
    app = await Store.getApplication();
  } catch (err) {
    area.innerHTML = `<div class="dash-card"><p class="auth-error visible">Could not load your application: ${err.message}</p></div>`;
    return;
  }

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
  const badgeEl = tpl.querySelector('.status-badge');
  const s = (app.status || '').toLowerCase();
  if (s.includes('reject') || (s.includes('not') && s.includes('allocat'))) badgeEl.classList.add('not-allocated');
  else if (s.includes('allocat')) badgeEl.classList.add('allocated');
  else if (s.includes('verif')) badgeEl.classList.add('verified');
  badgeEl.textContent = app.status ? app.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Submitted';
  tpl.querySelector('.submitted-date').textContent = app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : '—';
  tpl.querySelector('.s-name').textContent = currentUser.name;
  tpl.querySelector('.s-father').textContent = app.father_name || '—';
  tpl.querySelector('.s-cnic').textContent = currentUser.cnic || '—';
  tpl.querySelector('.s-dob').textContent = app.dob || '—';
  tpl.querySelector('.s-gender').textContent = app.gender || '—';
  tpl.querySelector('.s-phone').textContent = currentUser.phone || '—';
  tpl.querySelector('.s-email').textContent = currentUser.email || '—';
  tpl.querySelector('.s-program').textContent = PROGRAM_LABELS[app.program] || app.program || '—';
  tpl.querySelector('.s-qualification').textContent = app.qualification || '—';
  tpl.querySelector('.s-marksMatric').textContent = app.marks_matric ?? '—';
  tpl.querySelector('.s-marksFsc').textContent = app.marks_fsc ?? '—';
  tpl.querySelector('.s-address').textContent = app.address || '—';
  tpl.querySelector('.s-cnicNumber').textContent = app.cnic_number || '—';

  area.appendChild(tpl);

  // Profile picture + documents all live behind auth -- fetch as blobs.
  if (app.profile_picture) {
    Store.getFileUrl(app.profile_picture).then(res => {
      if (res) document.querySelector('.s-profile-pic').src = res.url;
    });
  }

  const docFilenames = [
    ...(app.cnic_front ? [app.cnic_front] : []),
    ...(app.cnic_back ? [app.cnic_back] : []),
    ...(app.domicile_doc ? [app.domicile_doc] : []),
    ...Store.parseFilenameList(app.matric_docs),
    ...Store.parseFilenameList(app.fsc_docs),
    ...(app.kmu_cat_doc ? [app.kmu_cat_doc] : []),
  ];
  const docsWrap = document.getElementById('summaryDocs');
  docFilenames.forEach(filename => {
    Store.getFileUrl(filename).then(res => {
      if (!res) return;
      if (res.isImage) {
        const img = document.createElement('img');
        img.src = res.url;
        img.alt = filename;
        img.title = filename;
        docsWrap.appendChild(img);
      } else {
        const link = document.createElement('a');
        link.href = res.url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.className = 'file-chip';
        link.textContent = filename;
        docsWrap.appendChild(link);
      }
    });
  });
}

function wireApplicationForm() {
  const form = document.getElementById('applicationForm');
  const errorEl = document.getElementById('appFormError');
  const submitBtn = document.getElementById('appSubmitBtn');

  // Live preview for the profile picture
  const profileInput = document.getElementById('profilePictureInput');
  const profilePreview = document.getElementById('profileAvatarPreview');
  profileInput.addEventListener('change', () => {
    const file = profileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      profilePreview.innerHTML = `<img src="${reader.result}" alt="Profile preview">`;
    };
    reader.readAsDataURL(file);
  });

  // Live previews for each required document
  ['cnicFront', 'cnicBack', 'domicile', 'matricDocs', 'fscDocs', 'kmuCat'].forEach(name => {
    wireUploadPreview(form.querySelector(`[name="${name}"]`), form.querySelector(`[data-preview-for="${name}"]`));
  });

  // Custom date picker for Date of Birth
  initDatePicker(form.querySelector('[data-datepicker]'));
  const dobHiddenInput = form.querySelector('input[name="dob"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.remove('visible');

    if (!profileInput.files[0]) {
      errorEl.textContent = 'Please upload a profile picture before submitting.';
      errorEl.classList.add('visible');
      profilePreview.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!dobHiddenInput.value) {
      errorEl.textContent = 'Please select a date of birth before submitting.';
      errorEl.classList.add('visible');
      form.querySelector('[data-datepicker]').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    submitBtn.disabled = true;

    try {
      submitBtn.textContent = 'Submitting application...';
      const f = form;
      const fields = {
        father: f.father.value.trim(),
        dob: dobHiddenInput.value,
        gender: f.gender.value,
        qualification: f.qualification.value,
        program: f.program.value,
        marksMatric: f.marksMatric.value.trim(),
        marksFsc: f.marksFsc.value.trim(),
        address: f.address.value.trim(),
        cnicNumber: f.cnicNumber.value.trim(),
      };
      const files = {
        profilePicture: filesToArray(profileInput.files),
        cnicFront: filesToArray(f.cnicFront.files),
        cnicBack: filesToArray(f.cnicBack.files),
        domicile: filesToArray(f.domicile.files),
        matricDocs: filesToArray(f.matricDocs.files),
        fscDocs: filesToArray(f.fscDocs.files),
        kmuCat: filesToArray(f.kmuCat.files),
      };

      await Store.submitApplication(fields, files);
      await renderApplicationArea();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      errorEl.textContent = err.message || 'Something went wrong while submitting. Please try again.';
      errorEl.classList.add('visible');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Application';
    }
  });
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

// Sidebar navigation
const dashNavLinks = document.querySelectorAll('.dash-nav-link');
const dashViews = document.querySelectorAll('.dash-view');
dashNavLinks.forEach(link => {
  link.addEventListener('click', () => {
    dashNavLinks.forEach(l => l.classList.remove('active'));
    dashViews.forEach(v => v.classList.remove('active'));
    link.classList.add('active');
    document.getElementById('view-' + link.dataset.view).classList.add('active');
    closeSidebar();
  });
});

// ===================== Init =====================
(async function init() {
  currentUser = await Store.getCurrentUser();
  if (!currentUser) {
    window.location.href = 'signin.html';
    return;
  }

  document.getElementById('userName').textContent = currentUser.name;
  document.getElementById('userEmailMini').textContent = currentUser.email;
  document.getElementById('acc-name').textContent = currentUser.name;
  document.getElementById('acc-cnic').textContent = currentUser.cnic;
  document.getElementById('acc-phone').textContent = currentUser.phone;
  document.getElementById('acc-email').textContent = currentUser.email;

  document.getElementById('logoutBtn').addEventListener('click', () => {
    Store.signOut();
    window.location.href = 'signin.html';
  });

  await renderApplicationArea();
})();
