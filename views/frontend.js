const uploadBtn = document.getElementById('upload-button');
const overlay = document.getElementById('upload-overlay');
const uploadForm = document.getElementById('upload-form');
const fileInput = document.getElementById('file-input');
const jsonInput = document.getElementById('json-input');

// Videos laden und Liste befüllen
async function loadVideos() {
  try {
    const response = await fetch('/api/video/list');
    const videos = await response.json();
    
    const videosSection = document.querySelector('.videos');
    videosSection.innerHTML = ''; // Bestehende Liste leeren
    
    videos.forEach(video => {
      const link = document.createElement('a');
      link.innerHTML = `
        <div class="video-title">${video.title.toUpperCase()}</div>
        <div class="video-subtitle">${video.uploadDate} &bull; ${video.uploader}</div>
      `;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        loadVideoContent(video._id);
      });
      videosSection.appendChild(link);
    });
  } catch (error) {
    console.error('Fehler beim Laden der Videos:', error);
  }
}

// Video-Inhalt laden
async function loadVideoContent(videoId) {
  try {
    const response = await fetch(`/api/video/show/${videoId}`);
    const video = await response.json();

    console.log(video);
    
    // Video laden
    const videoPlayer = document.querySelector('.video-player video source');
    videoPlayer.src = `/media/${video.filename}`;
    document.querySelector('.video-player video').load(); // Video neu laden
    
    // Transkription laden
    const transcriptSection = document.querySelector('.video-transcript');
    transcriptSection.innerHTML = '';
   
    video.transcription.segment.sentences.forEach(sentence => {
      const sentenceSpan = document.createElement('span');
      sentenceSpan.innerHTML = `${sentence.text || 'Kein Text'} `; // Passe an, wenn Sentence-Struktur anders ist
      transcriptSection.appendChild(sentenceSpan);
    });

  } catch (error) {
    console.error('Fehler beim Laden des Video-Inhalts:', error);
  }
}

document.addEventListener('DOMContentLoaded', loadVideos);


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