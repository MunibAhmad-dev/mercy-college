const adminLoginForm = document.getElementById('adminLoginForm');
const authError = document.getElementById('authError');
const adminSubmitBtn = adminLoginForm.querySelector('button[type="submit"]');

adminLoginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.classList.remove('visible');

  const email = adminLoginForm.email.value.trim();
  const password = adminLoginForm.password.value;

  adminSubmitBtn.disabled = true;
  adminSubmitBtn.textContent = 'Signing In...';

  try {
    await Store.adminSignIn(email, password);
    window.location.href = 'dashboard.html';
  } catch (err) {
    authError.textContent = err.message;
    authError.classList.add('visible');
    adminSubmitBtn.disabled = false;
    adminSubmitBtn.textContent = 'Sign In';
  }
});
