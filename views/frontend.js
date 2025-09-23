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

  // Tags laden und in Sidebar anzeigen
async function loadTags() {
  try {
    const response = await fetch('/api/video/tags');
    const tags = await response.json();
    
    const $tagsSection = $('.tags');
    $tagsSection.empty(); // Bestehende Tags leeren
    
    tags.forEach(({ tag, count }) => {
      const $link = $('<a>', {
        href: '#',
        'data-tag': tag, // Tag speichern
        html: `<span class="tag-title">${tag}</span><span class="pill">${count}</span>`
      });
      $tagsSection.append($link);
    });
  } catch (error) {
    console.error('Fehler beim Laden der Tags:', error);
  }
}

// Segmente nach Tag laden und anzeigen
async function loadSegmentsByTag(tag) {
  try {
    const response = await fetch(`/api/video/search-segments-by-tag/${encodeURIComponent(tag)}`);
    const segments = await response.json();
    
    // Content-Bereich leeren
    $('.video-transcript').empty();
    
    segments.forEach((segment, index) => {
      const containerId = `segment-container-${index}`;
      $('.video-transcript').append(`<div class="segment-container" id="${containerId}"></div>`);
      
      // Video-Player hinzufügen
      $(`#${containerId}`).append(`
        <div class="video-player">
          <video controls>
            <source src="/media/${segment.videoFilename || 'placeholder.mp4'}" type="video/mp4">
          </video>
        </div>
      `);
      
      // Video-Info hinzufügen
      $(`#${containerId}`).append(`
        <div class="video-info">
          <strong>${segment.videoTitle}</strong> by ${segment.videoUploader}
        </div>
      `);
      
      // SPEAKER + TAGS
      $(`#${containerId}`).append(`<div class="tags"></div>`);
      $(`#${containerId} .tags`).append(`<span class="pill speaker">${segment.speaker}</span>`);
      segment.tags.forEach(tagItem => {
        $(`#${containerId} .tags`).append(`<span class="pill">${tagItem}</span>`);
      });
      
      // SENTENCES
      $(`#${containerId}`).append(`<div class="text"></div>`);
      segment.sentences.forEach(sentence => {
        $(`#${containerId} .text`).append(`<span data-start="${sentence.start}" data-end="${sentence.end}">${sentence.text} </span>`);
      });
      
      // Highlighting für dieses Video
      $(`#${containerId} video`).on('timeupdate', function() {
        const currentTime = this.currentTime;
        $(`#${containerId} .text span`).removeClass('highlight');
        
        $(`#${containerId} .text span`).each(function() {
          const start = parseFloat($(this).data('start'));
          const end = parseFloat($(this).data('end'));
          if (currentTime >= start && currentTime < end) {
            $(this).addClass('highlight');
          }
        });
      });
      
      // Klick auf Sentence für dieses Segment
      $(`#${containerId}`).on('click', '.text span', function() {
        const startTime = parseFloat($(this).data('start'));
        if (!isNaN(startTime)) {
          const $video = $(`#${containerId} video`)[0];
          $video.currentTime = startTime;
          $video.play();
        }
      });
    });
    
  } catch (error) {
    console.error('Fehler beim Laden der Segmente:', error);
  }
}

// Klick auf Tag-Link in Sidebar
$('.tags').on('click', 'a', function(e) {
  e.preventDefault();
  const tag = $(this).data('tag');
  loadSegmentsByTag(tag);
});




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
        $(`.video-transcript section[data-id="${segment._id}"] .tags`).append(`<span class="add-tag"><i class="bi bi-plus-circle-fill"></i></span>`);

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

// Klick auf Tag-Pill für Bearbeiten/Löschen
$('.video-transcript').on('click', '.pill:not(.speaker)', async function(e) {
  e.preventDefault();
  const $pill = $(this);
  const segmentIndex = $pill.closest('.video-transcript section').index();
  const tagText = $pill.text();
  
  // Tags aus DB holen für Autocomplete
  const tagsResponse = await fetch('/api/video/tags');
  const allTags = await tagsResponse.json();
  const tagList = allTags.map(({ tag }) => tag); // Tags extrahieren
  
  // SweetAlert2-Popup mit Input und Datalist für Autocomplete (wie beim Neu-Erstellen)
  Swal.fire({
    title: 'Tag bearbeiten',
    html: `
      <input id="edit-tag-input" class="swal2-input" list="edit-tag-list" value="${tagText}" placeholder="Neuer Tag">
      <datalist id="edit-tag-list">
        ${tagList.map(tag => `<option value="${tag}">`).join('')}
      </datalist>
    `,
    showDenyButton: true,
    showCancelButton: true,
    confirmButtonText: 'Speichern',
    denyButtonText: 'Löschen',
    cancelButtonText: 'Abbrechen',
    preConfirm: () => {
      const inputValue = document.getElementById('edit-tag-input').value.trim();
      return inputValue;
    }
  }).then((result) => {
    if (result.isConfirmed) {
      // Speichern
      const newTag = result.value;
      if (newTag && newTag !== tagText) {
        fetch(`/api/video/update-tag/${videoId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ segmentIndex, oldTag: tagText, newTag })
        }).then(() => {
          loadVideoContent(videoId); // UI neu laden
        });
      }
    } else if (result.isDenied) {
      // Löschen mit Bestätigung
      Swal.fire({
        title: `Tag "${tagText}" wirklich löschen?`,
        text: 'Dies kann nicht rückgängig gemacht werden!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ja, löschen',
        cancelButtonText: 'Abbrechen'
      }).then((deleteResult) => {
        if (deleteResult.isConfirmed) {
          fetch(`/api/video/update-tag/${videoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ segmentIndex, oldTag: tagText, deleteTag: true })
          }).then(() => {
            loadVideoContent(videoId); // UI neu laden
          });
        }
      });
    }
    // Abbrechen: Nichts tun
  });
});

// Klick auf Plus-Icon für neues Tag
$('.video-transcript').on('click', '.add-tag', async function(e) {
  e.preventDefault();
  const $icon = $(this);
  const segmentIndex = $icon.closest('.video-transcript section').index();
  
  // Tags aus DB holen
  const tagsResponse = await fetch('/api/video/tags');
  const allTags = await tagsResponse.json();
  const tagList = allTags.map(({ tag }) => tag); // Tags extrahieren
  
  // SweetAlert2-Popup mit Input und Datalist für Autocomplete
  Swal.fire({
    title: 'Neues Tag hinzufügen',
    html: `
      <input id="tag-input" class="swal2-input" list="tag-list" placeholder="Tag eingeben">
      <datalist id="tag-list">
       ${tagList.map(tag => `<option value="${tag}">`).join('')}
      </datalist>
    `,
    showCancelButton: true,
    confirmButtonText: 'Hinzufügen',
    cancelButtonText: 'Abbrechen',
    preConfirm: () => {
      const inputValue = document.getElementById('tag-input').value.trim();
      return inputValue;
    }
  }).then((result) => {
    if (result.isConfirmed && result.value) {
      const newTag = result.value;
      // Daten an Endpoint senden
      fetch(`/api/video/add-tag/${videoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentIndex, newTag })
      }).then(() => {
        loadVideoContent(videoId); // UI neu laden
      });
    }
  });
});




    } catch (error) {
      console.error('Fehler beim Laden des Video-Inhalts:', error);
    }
  }

  // Videos beim Laden laden
  loadVideos();
  loadTags();

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