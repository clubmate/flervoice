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
      $('.video-transcript').empty();
      video.transcription.segments.forEach(segment => {
        
        $('.video-transcript').append(`<section data-id="${segment._id}"></section>`);

        // SPEAKER + TAGS
        $(`.video-transcript section[data-id="${segment._id}"]`).append(`<div class="tags"></div>`);
        $(`.video-transcript section[data-id="${segment._id}"] .tags`).append(`<span class="pill speaker">${segment.speaker}</span>`);
        segment.tags.forEach(tag => {
          $(`.video-transcript section[data-id="${segment._id}"] .tags`).append(`<span class="pill">${tag}</span>`);
        });

        // SENTENCES
        $(`.video-transcript section[data-id="${segment._id}"]`).append(`<div class="text"></div>`);
        segment.sentences.forEach(sentence => {
          $(`.video-transcript section[data-id="${segment._id}"] .text`).append(`<span data-start="${sentence.start}" data-end="${sentence.end}">${sentence.text} </span>`);
        });
      });

      // Highlighting für aktuellen Satz
      $('.video-player video').on('timeupdate', function() {
        
        const currentTime = $('.video-player video')[0].currentTime;
        $('.video-transcript .text span').removeClass('highlight'); // Alte Highlights entfernen
        
        $('.video-transcript .text span').each(function() {
          const start = parseFloat($(this).data('start'));
          const end = parseFloat($(this).data('end'));
          if (currentTime >= start && currentTime < end) {
            $(this).addClass('highlight');
          }
        });
      });

      // Rechtsklick auf Satz für Speaker-Änderung
$('.video-transcript .text span').on('contextmenu', function(e) {
  e.preventDefault();
  const $span = $(this);
  const segmentIndex = $span.closest('.video-transcript section').index();
  const sentenceIndex = $span.index();
  
  // Tooltip erstellen
  const $tooltip = $('<div>', {
    class: 'speaker-tooltip',
    html: `
      <input type="text" placeholder="Neuer Speaker" id="new-speaker">
      <button id="save-speaker">Speichern</button>
      <button id="cancel-speaker">Abbrechen</button>
    `,
    css: {
      position: 'absolute',
      top: e.pageY + 'px',
      left: e.pageX + 'px',
      background: '#fff',
      border: '1px solid #ccc',
      padding: '10px',
      zIndex: 1000
    }
  });
  $('body').append($tooltip);
  
  $('#save-speaker').on('click', async function() {
    const newSpeaker = $('#new-speaker').val().trim();
    if (newSpeaker) {
      // Daten an Endpoint senden
      await fetch(`/api/video/update-transcription/${videoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentIndex, sentenceIndex, newSpeaker })
      });
      
      // UI neu laden
      loadVideoContent(videoId);
    }
    $tooltip.remove();
  });
  
  $('#cancel-speaker').on('click', function() {
    $tooltip.remove();
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