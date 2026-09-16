const adminLoginForm = document.getElementById('adminLoginForm');
const authError = document.getElementById('authError');

adminLoginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  authError.classList.remove('visible');

  const username = adminLoginForm.username.value.trim();
  const password = adminLoginForm.password.value;

  try {
    // TODO: replace with fetch('/api/admin/login', { method:'POST', body: JSON.stringify({...}) })
    Store.adminSignIn(username, password);
    window.location.href = 'dashboard.html';
  } catch (err) {
    authError.textContent = err.message;
    authError.classList.add('visible');
  }
});
