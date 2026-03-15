// NusaCatch — main.js

// Show selected filename next to the file input
const fileInput = document.getElementById('fish_image');
const fileLabel = document.getElementById('file-name-display');
if (fileInput && fileLabel) {
  fileInput.addEventListener('change', () => {
    fileLabel.textContent = fileInput.files[0] ? fileInput.files[0].name : 'No file chosen';
  });
}

// Auto-dismiss alert banners after 5 seconds
document.querySelectorAll('.alert').forEach(el => {
  setTimeout(() => {
    el.style.transition = 'opacity .5s';
    el.style.opacity    = '0';
    setTimeout(() => el.remove(), 500);
  }, 5000);
});

// Highlight the active nav link
const path = window.location.pathname;
document.querySelectorAll('.nav-links a').forEach(a => {
  if (a.getAttribute('href') === path) {
    a.style.color      = 'var(--teal-light)';
    a.style.fontWeight = '700';
  }
});
