const uploadBtn = document.getElementById('upload-button');
const overlay = document.getElementById('upload-overlay');
const uploadForm = document.getElementById('upload-form');

// Overlay öffnen
uploadBtn.addEventListener('click', () => {
  overlay.style.display = 'flex';
});

// Overlay schließen bei Klick außerhalb
overlay.addEventListener('click', (e) => {
  if (e.target === overlay) {
    overlay.style.display = 'none';
  }
});

// Form-Submit (hier kannst du später die Upload-Logik hinzufügen)
uploadForm.addEventListener('submit', (e) => {
  e.preventDefault();
  alert('Datei hochgeladen: ' + document.getElementById('file-input').files[0].name);
  overlay.style.display = 'none';
});