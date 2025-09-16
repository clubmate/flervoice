const uploadBtn = document.getElementById('upload-button');
const overlay = document.getElementById('upload-overlay');
const uploadForm = document.getElementById('upload-form');
const fileInput = document.getElementById('file-input');
const jsonInput = document.getElementById('json-input');


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

// Form-Submit: Dateien hochladen
uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData();
  formData.append('mp4', fileInput.files[0]);
  formData.append('json', jsonInput.files[0]);

  try {
    const response = await fetch('/api/video/upload', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      alert('Dateien erfolgreich hochgeladen!');
      overlay.style.display = 'none';
      // Optional: Seite neu laden oder Liste aktualisieren
    } else {
      alert('Fehler beim Hochladen: ' + response.statusText);
    }
  } catch (error) {
    alert('Netzwerkfehler: ' + error.message);
  }
});