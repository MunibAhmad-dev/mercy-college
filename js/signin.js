const signinForm = document.getElementById('signinForm');
const authError = document.getElementById('authError');

signinForm.addEventListener('submit', (e) => {
  e.preventDefault();
  authError.classList.remove('visible');

  const email = signinForm.email.value.trim();
  const password = signinForm.password.value;

  try {
    // TODO: replace with fetch('/api/auth/signin', { method:'POST', body: JSON.stringify({...}) })
    Store.signIn(email, password);
    window.location.href = 'dashboard.html';
  } catch (err) {
    authError.textContent = err.message;
    authError.classList.add('visible');
  }
});
