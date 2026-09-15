// Year in footer
document.getElementById('year').textContent = new Date().getFullYear();

// Sticky header + top-bar collapse on scroll
const header = document.getElementById('header');
const topBar = document.getElementById('topBar');
window.addEventListener('scroll', () => {
  const scrolled = window.scrollY > 40;
  header.classList.toggle('scrolled', scrolled);
  topBar.classList.toggle('hide', scrolled);
  document.getElementById('backToTop').classList.toggle('visible', window.scrollY > 500);
});

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const mainNav = document.getElementById('mainNav');
navToggle.addEventListener('click', () => {
  mainNav.classList.toggle('open');
});
mainNav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => mainNav.classList.remove('open'));
});

// Active nav link highlight on scroll
const sections = document.querySelectorAll('section[id], header[id]');
const navLinks = document.querySelectorAll('.main-nav a');
window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(sec => {
    const top = sec.offsetTop - 120;
    if (window.scrollY >= top) current = sec.getAttribute('id');
  });
  navLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === '#' + current);
  });
});

// Curriculum tabs
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('active'));
    tabPanels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// Animated counters
const counters = document.querySelectorAll('.counter');
let countersStarted = false;
function animateCounters() {
  if (countersStarted) return;
  countersStarted = true;
  counters.forEach(counter => {
    const target = +counter.parentElement.parentElement.dataset.count;
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 60));
    const tick = () => {
      current += step;
      if (current >= target) {
        counter.textContent = target;
      } else {
        counter.textContent = current;
        requestAnimationFrame(tick);
      }
    };
    tick();
  });
}

// Reveal on scroll + trigger counters
const revealTargets = document.querySelectorAll(
  '.about-text, .about-media, .course-card, .faculty-card, .curriculum-tabs, .cta-copy, .cta-form, .quick-card'
);
revealTargets.forEach(el => el.classList.add('reveal'));

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
    }
  });
}, { threshold: 0.15 });

revealTargets.forEach(el => observer.observe(el));

const statsStrip = document.querySelector('.stats-strip');
const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounters();
      statsObserver.disconnect();
    }
  });
}, { threshold: 0.4 });
if (statsStrip) statsObserver.observe(statsStrip);

// Gallery lightbox
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
document.querySelectorAll('.gallery-grid img').forEach(img => {
  img.addEventListener('click', () => {
    lightboxImg.src = img.dataset.full || img.src;
    lightboxImg.alt = img.alt;
    lightbox.classList.add('open');
  });
});
document.getElementById('lightboxClose').addEventListener('click', () => {
  lightbox.classList.remove('open');
});
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) lightbox.classList.remove('open');
});

// Admission application form -> saves to backend (if available) and opens WhatsApp with the full application prefilled
const WHATSAPP_NUMBER = '923XXXXXXXXX'; // TODO: replace with the college's real WhatsApp number
const APPLICATIONS_API_ENDPOINT = '/api/applications'; // TODO: point this at your Express API once it's deployed
const applyForm = document.getElementById('applyForm');

if (applyForm) {
  const submitBtn = document.getElementById('applySubmitBtn');
  const formNote = document.getElementById('applyFormNote');
  const defaultNote = formNote.textContent;

  applyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = applyForm;

    const data = {
      name: f.name.value.trim(),
      father: f.father.value.trim(),
      cnic: f.cnic.value.trim(),
      dob: f.dob.value,
      gender: f.gender.value,
      phone: f.phone.value.trim(),
      email: f.email.value.trim(),
      address: f.address.value.trim(),
      qualification: f.qualification.value,
      marks: f.marks.value.trim(),
      program: f.program.value,
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    // Best-effort save to a backend API (e.g. your Express server). Silently
    // ignored if the endpoint isn't deployed yet -- WhatsApp still goes through.
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(APPLICATIONS_API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      formNote.textContent = res.ok
        ? 'Application saved. Opening WhatsApp to confirm with our team...'
        : defaultNote;
    } catch (err) {
      formNote.textContent = defaultNote; // no backend yet (or offline) -- WhatsApp still works
    }

    const message =
      `Assalam-o-Alaikum, I would like to apply to Mercy College of Nursing.\n\n` +
      `Full Name: ${data.name}\n` +
      `Father's/Guardian's Name: ${data.father}\n` +
      `CNIC/B-Form: ${data.cnic}\n` +
      `Date of Birth: ${data.dob}\n` +
      `Gender: ${data.gender}\n` +
      `Phone: ${data.phone}\n` +
      (data.email ? `Email: ${data.email}\n` : '') +
      `Address: ${data.address}\n` +
      `Previous Qualification: ${data.qualification}\n` +
      `Marks/Percentage: ${data.marks}\n` +
      `Program of Interest: ${data.program}`;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener');

    submitBtn.disabled = false;
    submitBtn.textContent = 'Send Application via WhatsApp';
  });
}
