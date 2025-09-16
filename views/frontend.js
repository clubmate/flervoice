$(function() { // Dokument bereit
  const $uploadBtn = $('#upload-button');
  const $overlay = $('#upload-overlay');
  const $uploadForm = $('#upload-form');
  const $fileInput = $('#file-input');
  const $jsonInput = $('#json-input');

  // Videos laden und Liste befüllen
  async function loadVideos() {
    try {
      const response = await fetch('/api/video/list');
      const videos = await response.json();
      
      const $videosSection = $('.videos');
      $videosSection.empty(); // Bestehende Liste leeren
      
      videos.forEach(video => {
        const $link = $('<a>', {
          href: '#',
          html: `
            <div class="video-title">${video.title.toUpperCase()}</div>
            <div class="video-subtitle">${video.uploadDate} &bull; ${video.uploader}</div>
          `
        });
        $link.on('click', function(e) {
          e.preventDefault();
          loadVideoContent(video._id);
        });
        $videosSection.append($link);
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
      
      // Video laden
      const $videoSource = $('.video-player video source');
      $videoSource.attr('src', `/media/${video.filename}`);
      $('.video-player video')[0].load(); // Video neu laden (jQuery-Objekt zu DOM-Element)
      
      // Transkription laden
      $('.video-transcript section').empty();
      video.transcription.segments.forEach(segment => {
        console.log(segment);

        // TAGS
        $('.video-transcript section').append(`<div class="tags"></div>`);
        segment.tags.forEach(tag => {
          $('.tags').append(`<span class="pill">${tag}</span>`);
        });

        // SENTENCES
        $('.video-transcript section').append(`<div class="text"></div>`);
        segment.sentences.forEach(sentence => {
          $('.text').append(`<span data-start="${sentence.start}" data-end="${sentence.end}">${sentence.text} </span>`);
        });

      });

    } catch (error) {
      console.error('Fehler beim Laden des Video-Inhalts:', error);
    }
  }

  // Videos beim Laden laden
  loadVideos();

  // Overlay öffnen
  $uploadBtn.on('click', function() {
    $overlay.css('display', 'flex');
  });

  // Overlay schließen bei Klick außerhalb
  $overlay.on('click', function(e) {
    if (e.target === this) {
      $overlay.css('display', 'none');
    }
  });

  // Form-Submit: Dateien hochladen
  $uploadForm.on('submit', async function(e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append('mp4', $fileInput[0].files[0]);
    formData.append('json', $jsonInput[0].files[0]);

    try {
      const response = await fetch('/api/video/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        alert('Dateien erfolgreich hochgeladen!');
        $overlay.css('display', 'none');
        // Optional: Seite neu laden oder Liste aktualisieren
      } else {
        alert('Fehler beim Hochladen: ' + response.statusText);
      }
    } catch (error) {
      alert('Netzwerkfehler: ' + error.message);
    }
  });
});