const signinForm = document.getElementById('signinForm');
const authError = document.getElementById('authError');
const signinSubmitBtn = signinForm.querySelector('button[type="submit"]');

signinForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.classList.remove('visible');

  const email = signinForm.email.value.trim();
  const password = signinForm.password.value;

  signinSubmitBtn.disabled = true;
  signinSubmitBtn.textContent = 'Signing In...';

  try {
    await Store.signIn(email, password);
    window.location.href = 'dashboard.html';
  } catch (err) {
    authError.textContent = err.message;
    authError.classList.add('visible');
    signinSubmitBtn.disabled = false;
    signinSubmitBtn.textContent = 'Sign In';
  }
});
