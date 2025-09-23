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

  // Gemeinsame Funktion zum Rendern eines Segments
  function renderSegment($container, segment, videoId, videoFilename, videoTitle, videoUploader, segmentIndex) {
    $container.attr('data-video-id', videoId);
    $container.attr('data-segment-index', segmentIndex);
    
    // Video-Player immer hinzufügen (leer, wenn kein Video)
    $container.append(`<div class="video-player"></div>`);
    if (videoFilename) {
      $container.find('.video-player').append(`
        <video controls>
          <source src="/media/${videoFilename}" type="video/mp4">
        </video>
        <div class="video-info">
          <strong>${videoTitle}</strong> by ${videoUploader}
        </div>
      `);
    }
    
    // SPEAKER + TAGS
    $container.append(`<div class="tags"></div>`);
    $container.find('.tags').append(`<span class="pill speaker">${segment.speaker}</span>`);
    segment.tags.forEach(tag => {
      $container.find('.tags').append(`<span class="pill">${tag}</span>`);
    });
    $container.find('.tags').append(`<span class="add-tag"><i class="bi bi-plus-circle-fill"></i></span>`);
    
    // SENTENCES
    $container.append(`<div class="text"></div>`);
    segment.sentences.forEach(sentence => {
      $container.find('.text').append(`<span data-start="${sentence.start}" data-end="${sentence.end}">${sentence.text} </span>`);
    });
  }

  // Segmente nach Tag laden und anzeigen
  async function loadSegmentsByTag(tag) {
    try {
      const response = await fetch(`/api/video/search-segments-by-tag/${encodeURIComponent(tag)}`);
      const segments = await response.json();
      
      // Content-Bereich leeren
      $('.video-transcript').empty();
      
      // Segmente nach Video gruppieren
      const grouped = segments.reduce((acc, segment) => {
        if (!acc[segment.videoId]) acc[segment.videoId] = [];
        acc[segment.videoId].push(segment);
        return acc;
      }, {});
      
      // Für jede Gruppe rendern
      Object.values(grouped).forEach(group => {
        group.forEach((segment, index) => {
          const $container = $('<div class="segment-container">');
          const showVideo = index === 0; // Video nur beim ersten Segment der Gruppe
          renderSegment($container, segment, segment.videoId, showVideo ? segment.videoFilename : null, showVideo ? segment.videoTitle : null, showVideo ? segment.videoUploader : null, segment.segmentIndex);
          $('.video-transcript').append($container);
        });
      });
      
      // Highlighting für jedes Container-Video
      $('.segment-container video').each(function() {
        $(this).on('timeupdate', function() {
          const currentTime = this.currentTime;
          const $container = $(this).closest('.segment-container');
          $container.find('.text span').removeClass('highlight');
          
          $container.find('.text span').each(function() {
            const start = parseFloat($(this).data('start'));
            const end = parseFloat($(this).data('end'));
            if (currentTime >= start && currentTime < end) {
              $(this).addClass('highlight');
            }
          });
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
      
      // Transkription laden
      $('.video-transcript').empty();
      video.transcription.segments.forEach((segment, index) => {
        const $container = $('<div class="segment-container">');
        const showVideo = index === 0; // Video nur beim ersten Segment
        renderSegment($container, segment, videoId, showVideo ? video.filename : null, showVideo ? video.title : null, showVideo ? video.uploader : null, index);
        $('.video-transcript').append($container);
      });

      // Highlighting für das Video im ersten Segment
      const $firstVideo = $('.video-transcript .segment-container:first .video-player video');
      if ($firstVideo.length) {
        $firstVideo.on('timeupdate', function() {
          const currentTime = this.currentTime;
          $('.video-transcript .text span').removeClass('highlight');
          
          $('.video-transcript .text span').each(function() {
            const start = parseFloat($(this).data('start'));
            const end = parseFloat($(this).data('end'));
            if (currentTime >= start && currentTime < end) {
              $(this).addClass('highlight');
            }
          });
        });
      }

    } catch (error) {
      console.error('Fehler beim Laden des Video-Inhalts:', error);
    }
  }

  // Globale Events für Interaktionen
  // Rechtsklick auf Satz für Speaker-Änderung
  $('.video-transcript').on('contextmenu', '.text span', function(e) {
    e.preventDefault();
    const $span = $(this);
    const $container = $span.closest('[data-video-id]');
    const videoId = $container.data('video-id');
    const segmentIndex = $container.data('segment-index');
    const sentenceIndex = $span.index();
    
    Swal.fire({
      title: 'SPLIT SEGMENT',
      input: 'select',
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
        fetch(`/api/video/update-transcription/${videoId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ segmentIndex, sentenceIndex, newSpeaker })
        }).then(() => {
          // Nach Update neu laden, abhängig vom Modus
          if ($('.video-transcript .segment-container').length > 1) {
            // Tag-Modus, aber da Segmente aus verschiedenen Videos, besser die aktuelle Ansicht neu laden
            // Für Einfachheit, lade die Tag-Ansicht neu, aber das ist tricky.
            // Da videoId bekannt, lade loadVideoContent(videoId), aber das wechselt zur normalen Ansicht.
            // Um zu bleiben, könnte man die URL oder einen Modus speichern.
            // Für jetzt, lade loadVideoContent, aber das ist nicht ideal.
            loadVideoContent(videoId);
          } else {
            loadVideoContent(videoId);
          }
        });
      }
    });
  });

  // Klick auf Speaker-Pill für Speaker-Änderung
  $('.video-transcript').on('click', '.pill.speaker', function(e) {
    e.preventDefault();
    const $pill = $(this);
    const $container = $pill.closest('[data-video-id]');
    const videoId = $container.data('video-id');
    const segmentIndex = $container.data('segment-index');
    const currentSpeaker = $pill.text();
    
    Swal.fire({
      title: 'CHANGE SPEAKER',
      input: 'select',
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
        fetch(`/api/video/update-transcription/${videoId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ segmentIndex, newSpeaker })
        }).then(() => {
          loadVideoContent(videoId);
        });
      }
    });
  });

  // Klick auf Sentence, um Video zu springen
  $('.video-transcript').on('click', '.text span', function() {
    const $span = $(this);
    const $container = $span.closest('[data-video-id]');
    const $video = $container.find('video')[0] || $('.video-transcript [data-video-id] .video-player video')[0];
    if ($video) {
      const startTime = parseFloat($span.data('start'));
      if (!isNaN(startTime)) {
        $video.currentTime = startTime;
        $video.play();
      }
    }
  });

  // Doppelklick auf Sentence für Text-Änderung
  $('.video-transcript').on('dblclick', '.text span', function() {
    const $span = $(this);
    const $container = $span.closest('[data-video-id]');
    const videoId = $container.data('video-id');
    const segmentIndex = $container.data('segment-index');
    const sentenceIndex = $span.index();
    const startTime = parseFloat($span.data('start'));
    const endTime = parseFloat($span.data('end'));
    const originalText = $span.text().trim();
    
    const $video = $container.find('video')[0] || $('.video-transcript [data-video-id] .video-player video')[0];
    const currentTimeBefore = $video ? $video.currentTime : 0;
    const wasPlaying = $video ? !$video.paused : false;
    
    if ($video) {
      $video.currentTime = startTime;
      let loopActive = true;
      const loopHandler = () => {
        if (loopActive && $video.currentTime >= endTime) {
          $video.currentTime = startTime;
        }
      };
      $video.addEventListener('timeupdate', loopHandler);
      
      Swal.fire({
        title: 'Sentence bearbeiten',
        input: 'text',
        inputValue: originalText,
        inputPlaceholder: 'Neuer Text',
        showCancelButton: true,
        confirmButtonText: 'Speichern',
        cancelButtonText: 'Abbrechen',
        didOpen: () => {},
        willClose: () => {
          loopActive = false;
          $video.removeEventListener('timeupdate', loopHandler);
        }
      }).then(async (result) => {
        $video.removeEventListener('timeupdate', loopHandler);
        
        if (result.isConfirmed && result.value && result.value !== originalText) {
          const newText = result.value.trim();
          await fetch(`/api/video/update-sentence/${videoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ segmentIndex, sentenceIndex, newText })
          });
          
          loadVideoContent(videoId);
          if ($video) {
            $video.addEventListener('loadeddata', function onLoaded() {
              $video.currentTime = currentTimeBefore;
              if (wasPlaying) {
                $video.play();
              }
              $video.removeEventListener('loadeddata', onLoaded);
            });
          }
        }
      });
    } else {
      // Fallback ohne Video
      Swal.fire({
        title: 'Sentence bearbeiten',
        input: 'text',
        inputValue: originalText,
        inputPlaceholder: 'Neuer Text',
        showCancelButton: true,
        confirmButtonText: 'Speichern',
        cancelButtonText: 'Abbrechen'
      }).then(async (result) => {
        if (result.isConfirmed && result.value && result.value !== originalText) {
          const newText = result.value.trim();
          await fetch(`/api/video/update-sentence/${videoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ segmentIndex, sentenceIndex, newText })
          });
          
          loadVideoContent(videoId);
        }
      });
    }
  });

  // Klick auf Tag-Pill für Bearbeiten/Löschen
  $('.video-transcript').on('click', '.pill:not(.speaker)', async function(e) {
    e.preventDefault();
    const $pill = $(this);
    const $container = $pill.closest('[data-video-id]');
    const videoId = $container.data('video-id');
    const segmentIndex = $container.data('segment-index');
    const tagText = $pill.text();
    
    const tagsResponse = await fetch('/api/video/tags');
    const allTags = await tagsResponse.json();
    const tagList = allTags.map(({ tag }) => tag);
    
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
        const newTag = result.value;
        if (newTag && newTag !== tagText) {
          fetch(`/api/video/update-tag/${videoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ segmentIndex, oldTag: tagText, newTag })
          }).then(() => {
            loadVideoContent(videoId);
          });
        }
      } else if (result.isDenied) {
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
              loadVideoContent(videoId);
            });
          }
        });
      }
    });
  });

  // Klick auf Plus-Icon für neues Tag
  $('.video-transcript').on('click', '.add-tag', async function(e) {
    e.preventDefault();
    const $icon = $(this);
    const $container = $icon.closest('[data-video-id]');
    const videoId = $container.data('video-id');
    const segmentIndex = $container.data('segment-index');
    
    const tagsResponse = await fetch('/api/video/tags');
    const allTags = await tagsResponse.json();
    const tagList = allTags.map(({ tag }) => tag);
    
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
        fetch(`/api/video/add-tag/${videoId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ segmentIndex, newTag })
        }).then(() => {
          loadVideoContent(videoId);
        });
      }
    });
  });

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