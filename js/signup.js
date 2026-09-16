const signupForm = document.getElementById('signupForm');
const authError = document.getElementById('authError');
const signupSubmitBtn = signupForm.querySelector('button[type="submit"]');

function showError(message) {
  authError.textContent = message;
  authError.classList.add('visible');
}

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.classList.remove('visible');

  const f = signupForm;
  const name = f.name.value.trim();
  const cnic = f.cnic.value.trim();
  const phone = f.phone.value.trim();
  const email = f.email.value.trim();
  const password = f.password.value;
  const confirmPassword = f.confirmPassword.value;

  if (password !== confirmPassword) {
    showError('Passwords do not match.');
    return;
  }
  if (password.length < 6) {
    showError('Password must be at least 6 characters.');
    return;
  }

  signupSubmitBtn.disabled = true;
  signupSubmitBtn.textContent = 'Creating Account...';

  try {
    await Store.signUp({ name, cnic, phone, email, password });
    window.location.href = 'dashboard.html';
  } catch (err) {
    showError(err.message);
    signupSubmitBtn.disabled = false;
    signupSubmitBtn.textContent = 'Create Account';
  }
});
