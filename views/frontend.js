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
  
  Swal.fire({
    title: 'SPLIT SEGMENT',
    input: 'select', // Select-Feld anstatt Text
    inputOptions: {
      FLER: 'FLER',
      INTERVIEWER: 'INTERVIEWER',
      OTHER: 'OTHER'
    },
    inputPlaceholder: 'SPEAKER',
    showCancelButton: true,
    confirmButtonText: 'SAVE',
    cancelButtonText: 'CANCEL'
  }).then((result) => {
    if (result.isConfirmed && result.value) {
      const newSpeaker = result.value.trim();
      // Daten an Endpoint senden
      fetch(`/api/video/update-transcription/${videoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentIndex, sentenceIndex, newSpeaker })
      }).then(() => {
        loadVideoContent(videoId); // UI neu laden
      });
    }
  });
});



// Klick auf Speaker-Pill für Speaker-Änderung
$('.video-transcript').on('click', '.pill.speaker', function(e) {
  e.preventDefault();
  const $pill = $(this);
  const segmentIndex = $pill.closest('.video-transcript section').index();
  const currentSpeaker = $pill.text();
  
  Swal.fire({
    title: 'CHANGE SPEAKER',
    input: 'select', // Select-Feld anstatt Text
    inputOptions: {
      FLER: 'FLER',
      INTERVIEWER: 'INTERVIEWER',
      OTHER: 'OTHER'
    },
    inputValue: currentSpeaker,
    inputPlaceholder: 'SPEAKER',
    showCancelButton: true,
    confirmButtonText: 'SAVE',
    cancelButtonText: 'CANCEL'
  }).then((result) => {
    if (result.isConfirmed && result.value && result.value !== currentSpeaker) {
      const newSpeaker = result.value.trim();
      // Daten an Endpoint senden
      fetch(`/api/video/update-transcription/${videoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentIndex, newSpeaker })
      }).then(() => {
        loadVideoContent(videoId); // UI neu laden
      });
    }
  });
});

// Doppelklick auf Sentence für Text-Änderung
$('.video-transcript').on('dblclick', '.text span', function() {
  const $span = $(this);
  const segmentIndex = $span.closest('.video-transcript section').index();
  const sentenceIndex = $span.index();
  const startTime = parseFloat($span.data('start'));
  const endTime = parseFloat($span.data('end'));
  const originalText = $span.text().trim();
  
  const $video = $('.video-player video')[0];
  const currentTimeBefore = $video.currentTime; // Aktuelle Zeit speichern
  const wasPlaying = !$video.paused; // Prüfen, ob es spielte
  
  // Video auf Start setzen und Loop aktivieren
  $video.currentTime = startTime;
  let loopActive = true;
  const loopHandler = () => {
    if (loopActive && $video.currentTime >= endTime) {
      $video.currentTime = startTime;
    }
  };
  $video.addEventListener('timeupdate', loopHandler);
  
  // SweetAlert2-Popup
  Swal.fire({
    title: 'Sentence bearbeiten',
    input: 'text',
    inputValue: originalText,
    inputPlaceholder: 'Neuer Text',
    showCancelButton: true,
    confirmButtonText: 'Speichern',
    cancelButtonText: 'Abbrechen',
    didOpen: () => {
      // Video läuft weiter
    },
    willClose: () => {
      // Loop deaktivieren und Handler entfernen
      loopActive = false;
      $video.removeEventListener('timeupdate', loopHandler);
    }
  }).then(async (result) => {
    // Handler sicherheitshalber entfernen
    $video.removeEventListener('timeupdate', loopHandler);
    
    if (result.isConfirmed && result.value && result.value !== originalText) {
      const newText = result.value.trim();
      // Daten an Endpoint senden
      await fetch(`/api/video/update-sentence/${videoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentIndex, sentenceIndex, newText })
      });
      
      // UI neu laden, aber Video-Zeit und Play-Status wiederherstellen
      await loadVideoContent(videoId);
      $video.addEventListener('loadeddata', function onLoaded() {
        $video.currentTime = currentTimeBefore;
        if (wasPlaying) {
          $video.play();
        }
        $video.removeEventListener('loadeddata', onLoaded);
      });
    }
  });
});

// Klick auf Sentence, um Video zu springen
$('.video-transcript').on('click', '.text span', function() {
  const startTime = parseFloat($(this).data('start'));
  if (!isNaN(startTime)) {
    const $video = $('.video-player video')[0];
    $video.currentTime = startTime;
    $video.play(); // Video abspielen, falls es pausiert war
  }
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