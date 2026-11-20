const form = document.querySelector('form');
const emailField = document.querySelector('#mail');
const emailHelp = document.querySelector('#mail-help');
const formStatus = document.querySelector('#form-status');

// Older browsers expose an unsupported input type as "text". Keep the native
// email control when available and provide explicit validation when it is not.
if (emailField.type !== 'email') {
  emailHelp.hidden = false;
  form.addEventListener('submit', (event) => {
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value.trim());
    if (!isValid) {
      event.preventDefault();
      emailField.setAttribute('aria-invalid', 'true');
      formStatus.textContent = 'Enter an email address in the format name@example.com.';
      emailField.focus();
      return;
    }

    emailField.removeAttribute('aria-invalid');
    formStatus.textContent = '';
  });
}
