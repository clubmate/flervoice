// LOAD SIDEBAR VIDEOS
async function loadVideos() {
  try {
    const response = await fetch('/api/video/list');
    const videos = await response.json();
      
    $('#videoList').empty();
      
    videos.forEach(video => {
      const title = video.title.length > 45 ? video.title.substring(0, 45) + '...' : video.title;
      const $link = $('<a>', {
        html: `
          <div class="video-title">${title.toUpperCase()}</div>
          <div class="video-subtitle">${video.uploadDate} &bull; ${video.uploader}</div>
          <div class="video-tags">${video.videoTags && video.videoTags.length > 0 ? video.videoTags.map(tag => `<span class="pill edit-video-tags" data-id="${video._id}">${tag}</span>`).join('') : `<span class="pill edit-video-tags" data-id="${video._id}">ADD TAG</span>`}</div>
        `
      });
  
      // CLICK-EVENT FOR TAGS AND LOADING VIDEO CONTENT
      $link.on('click', function(e) {
        if ($(e.target).hasClass('edit-video-tags')) {
          e.preventDefault();
          const videoId = $(e.target).data('id');
          const currentTags = video.videoTags ? video.videoTags.join(', ') : '';
          Swal.fire({
            title: 'EDIT VIDEO-TAGS',
            input: 'text',
            inputValue: currentTags,
            inputPlaceholder: 'TAGS',
            showCancelButton: true,
            confirmButtonText: 'SAVE',
            cancelButtonText: 'CANCEL',
          }).then((result) => {
            if (result.isConfirmed && result.value !== null) {
              const tags = result.value.split(',').map(tag => tag.trim()).filter(tag => tag);
              fetch(`/api/video/update-video-tags/${videoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoTags: tags })
              }).then(() => { 
                loadVideos(); 
              });
            }
          });
        } else {
          loadVideoContent(video._id);
        }
      });
      $('#videoList').append($link);
    });
  } catch (error) {
    console.error('Fehler beim Laden der Videos:', error);
  }
}

// LOAD SIDEBAR TAGS
async function loadTags() {
  try {
    const response = await fetch('/api/video/tags');
    const tags = await response.json();
      
    $('#tagList').empty();
      
    tags.forEach(({ tag, count }) => {
      const $tag = $('<a>', {
        'data-tag': tag,
        html: `<span class="tag-title">${tag}</span><span class="pill">${count}</span>`
      });

      // CLICK-EVENT FOR TAGS
      $tag.on('click', function(e) {
        e.preventDefault();
        const tag = $(this).data('tag');
        loadSegmentsByTag(tag);
      });

      $('#tagList').append($tag);
    });
  } catch (error) {
      console.error('Fehler beim Laden der Tags:', error);
  }
}

// UPLOAD VIDEO
function uploadVideo() {
  Swal.fire({
    title: 'UPLOAD VIDEO',
    html: `
      <input type="file" id="mp4-file" accept=".mp4">
      <label for="mp4-file">MP4-FILE</label><br>
      <input type="file" id="json-file" accept=".json">
      <label for="json-file">JSON-FILE</label>
    `,
    showCancelButton: true,
    confirmButtonText: 'UPLOAD',
    cancelButtonText: 'CANCEL',
    preConfirm: () => {
      const mp4 = document.getElementById('mp4-file').files[0];
      const json = document.getElementById('json-file').files[0];
      if (!mp4 || !json) {
        Swal.showValidationMessage('Beide Dateien (MP4 und JSON) sind erforderlich');
        return false;
      }
      return { mp4, json };
    }
  }).then((result) => {
    if (result.isConfirmed) {
      const formData = new FormData();
      formData.append('mp4', result.value.mp4);
      formData.append('json', result.value.json);
      
      fetch('/api/video/upload', {
        method: 'POST',
        body: formData
      }).then(response => {
        if (response.ok) {
          Swal.fire('Erfolg', 'Dateien erfolgreich hochgeladen!', 'success');
          loadVideos(); // Liste neu laden
        } else {
          Swal.fire('Fehler', 'Upload fehlgeschlagen: ' + response.statusText, 'error');
        }
      }).catch(error => {
        Swal.fire('Fehler', 'Netzwerkfehler: ' + error.message, 'error');
      });
    }
  });
}

// SEGMENT RENDERING
function renderSegment($container, segment, videoId, segmentIndex) {
  $container.attr('data-video-id', videoId);
  $container.attr('data-segment-index', segmentIndex);
  
  // SPEAKER + TAGS
  $container.append(`<div class="tags"></div>`);
  $container.find('.tags').append(`<span class="pill speaker">${segment.speaker}</span>`);
  segment.tags.forEach(tag => {
    $container.find('.tags').append(`<span class="pill tag">${tag}</span>`);
  });
  if (segment.tags.length === 0) {
    $container.find('.tags').append(`<span class="pill tag add">ADD TAGS</span>`);
  }
  
  // SENTENCES
  $container.append(`<div class="text"></div>`);
  segment.sentences.forEach(sentence => {
    $container.find('.text').append(`<span data-start="${sentence.start}" data-end="${sentence.end}">${sentence.text} </span>`);
  });
}

// LOAD VIDEO CONTENT
async function loadVideoContent(videoId) {
  try {
    const response = await fetch(`/api/video/show/${videoId}`);
    const video = await response.json();

    // HERVORHEBUNG SETZEN
    $('#videoList a').removeClass('active');
    $('#videoList a').filter(function() {
      return $(this).find(`[data-id="${videoId}"]`).length > 0;
    }).addClass('active');

    $('main').empty();
    const $group = $('<section>');
    
    // VIDEO-PLAYER
    $group.append(`
      <div class="video-player">
        <div class="video-info">
          <video controls>
            <source src="/media/${video.filename}" type="video/mp4">
          </video>
          <strong>${video.title}</strong>
          <div class="video-tags">${video.videoTags ? video.videoTags.map(tag => `<span class="pill">${tag}</span>`).join('') : ''}</div>
        </div>
      </div>
    `);

    // TEXT HIGHLIGHTING FOR VIDEO
    const $video = $group.find('video')[0];
    if ($video) {
      $video.addEventListener('timeupdate', function() {
        const currentTime = this.currentTime;
        $group.find('.text span').removeClass('highlight');
        
        $group.find('.text span').each(function() {
          const start = parseFloat($(this).data('start'));
          const end = parseFloat($(this).data('end'));
          if (currentTime >= start && currentTime < end) {
            $(this).addClass('highlight');
          }
        });
      });
    }
    
    // SEGMENTS
    const $segments = $('<div class="video-segment">');
    video.transcription.segments.forEach((segment, index) => {
      const $container = $('<section>');
      renderSegment($container, segment, videoId, index);
      $segments.append($container);
    });
    $group.append($segments);
    
    $('main').append($group);

  } catch (error) {
    console.error('Fehler beim Laden des Video-Inhalts:', error);
  }
}

// EDIT SEGMENT SPEAKER
function editSegmentSpeaker($pill) {
  const $container = $pill.closest('[data-video-id]');
  const videoId = $container.data('video-id');
  const segmentIndex = $container.data('segment-index');
  const currentSpeaker = $pill.text();
  
  Swal.fire({
    title: 'EDIT SPEAKER',
    input: 'text',
    inputValue: currentSpeaker,
    inputPlaceholder: 'SPEAKER',
    showCancelButton: true,
    confirmButtonText: 'SAVE',
    cancelButtonText: 'CANCEL'
  }).then(async (result) => {
    if (result.isConfirmed && result.value && result.value !== currentSpeaker) {
      const newSpeaker = result.value.trim().toUpperCase();
      
      // Ändere den Speaker (Endpoint übernimmt Merging)
      await fetch(`/api/video/update-speaker/${videoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentIndex, newSpeaker })
      });
      
      loadVideoContent(videoId);
    }
  });
}

// EDIT SEGMENT TAGS
function editSegmentTags($pill) {
  const $container = $pill.closest('[data-video-id]');
  const videoId = $container.data('video-id');
  const segmentIndex = $container.data('segment-index');
  const $tagsContainer = $container.find('.tags');
  const isAddTags = $pill.text() === 'ADD TAGS';
  const currentTags = isAddTags ? '' : $tagsContainer.find('.pill:not(.speaker)').map(function() { return $(this).text(); }).get().filter(tag => tag !== 'ADD TAGS').join(', ');
  
  Swal.fire({
    title: 'EDIT TAGS',
    input: 'text',
    inputValue: currentTags,
    inputPlaceholder: 'TAGS (comma-separated)',
    showCancelButton: true,
    confirmButtonText: 'SAVE',
    cancelButtonText: 'CANCEL'
  }).then(async (result) => {
    if (result.isConfirmed && result.value !== null) {
      const newTags = result.value.split(',').map(tag => tag.trim().toUpperCase()).filter(tag => tag);
      
      // Update Tags
      const oldTags = $tagsContainer.find('.pill:not(.speaker)').map(function() { return $(this).text(); }).get();
      for (const oldTag of oldTags) {
        await fetch(`/api/video/update-tag/${videoId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ segmentIndex, oldTag, deleteTag: true })
        });
      }
      for (const newTag of newTags) {
        await fetch(`/api/video/add-tag/${videoId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ segmentIndex, newTag })
        });
      }
      
      loadVideoContent(videoId);
    }
  });
}

// SPLIT SEGMENT
function splitSegment($span) {
  const $container = $span.closest('[data-video-id]');
  const videoId = $container.data('video-id');
  const segmentIndex = $container.data('segment-index');
  const sentenceIndex = $span.index();
  
  // Hole die Transcription, um den vorherigen Speaker zu prüfen
  fetch(`/api/video/show/${videoId}`)
    .then(response => response.json())
    .then(video => {
      const segments = video.transcription.segments;
      const previousSpeaker = segmentIndex > 0 ? segments[segmentIndex - 1].speaker : null;
      
      Swal.fire({
        title: 'SPLIT SEGMENT',
        input: 'text',
        inputPlaceholder: 'SPEAKER',
        showCancelButton: true,
        confirmButtonText: 'SAVE',
        cancelButtonText: 'CANCEL'
      }).then((result) => {
        if (result.isConfirmed && result.value) {
          const newSpeaker = result.value.trim().toUpperCase();
          
          // Spezialfall: Wenn neuer Speaker gleich dem vorherigen ist, nicht splitten
          if (previousSpeaker && newSpeaker === previousSpeaker) {
            Swal.fire('Info', 'SAME SPEAKER LIKE SEGMENT BEFORE', 'info');
            return;
          }
          
          fetch(`/api/video/update-transcription/${videoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ segmentIndex, sentenceIndex, newSpeaker })
          }).then(() => {
            loadVideoContent(videoId);
          });
        }
      });
    })
    .catch(error => {
      console.error('Fehler beim Laden der Transcription:', error);
    });
}

// ON LOAD
$(function() {

  // EXPAND SIDEBAR
  $('#expand-button').on('click', function() { $('aside').toggleClass('collapsed'); });

  // UPLOAD VIDEO
  $('#upload-button').on('click', function() { uploadVideo(); });

  // EDIT SEGMENT SPEAKER
  $('main').on('click', '.pill.speaker', function() { editSegmentSpeaker($(this)); });

  // EDIT SEGMENT TAGS
  $('main').on('click', '.pill.tag', function() { editSegmentTags($(this)); });

  // SPLIT SEGMENT
  $('main').on('contextmenu', '.text span', function(e) { e.preventDefault(); splitSegment($(this)); });

  loadVideos();
  loadTags();
    
});







/* $(function() { // Dokument bereit
  const $uploadBtn = $('#upload-button');
  const $overlay = $('#upload-overlay');
  const $uploadForm = $('#upload-form');
  const $fileInput = $('#file-input');
  const $jsonInput = $('#json-input');



 

  // Gemeinsame Funktion zum Rendern eines Segments
  function renderSegment($container, segment, videoId, segmentIndex) {
    $container.attr('data-video-id', videoId);
    $container.attr('data-segment-index', segmentIndex);
    
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
        const $group = $('<div class="video-group">');
        
        // Video-Player für die Gruppe
        $group.append(`
          <div class="video-player">
            <video controls>
              <source src="/media/${group[0].videoFilename}" type="video/mp4">
            </video>
            <div class="video-info">
              <strong>${group[0].videoTitle}</strong>
              <div class="video-tags">${group[0].videoTags ? group[0].videoTags.map(tag => `<span class="pill">${tag}</span>`).join('') : ''}</div>
            </div>
          </div>
        `);
        
        // Segmente wrapper
        const $segments = $('<div class="segments">');
        group.forEach((segment, index) => {
          const $container = $('<div class="segment-container">');
          renderSegment($container, segment, segment.videoId, segment.segmentIndex);
          $segments.append($container);
        });
        $group.append($segments);
        
        $('.video-transcript').append($group);
      });
      
      // Highlighting für jedes Video
      $('.video-group video').each(function() {
        $(this).on('timeupdate', function() {
          const currentTime = this.currentTime;
          const $group = $(this).closest('.video-group');
          $group.find('.text span').removeClass('highlight');
          
          $group.find('.text span').each(function() {
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



  // Video-Inhalt laden
  async function loadVideoContent(videoId) {
    try {
      const response = await fetch(`/api/video/show/${videoId}`);
      const video = await response.json();
      
      // Transkription laden
      $('.video-transcript').empty();
      
      const $group = $('<div class="video-group">');
      
      // Video-Player
      $group.append(`
        <div class="video-player">
          <video controls>
            <source src="/media/${video.filename}" type="video/mp4">
          </video>
          <div class="video-info">
            <strong>${video.title}</strong>
            <div class="video-tags">${video.videoTags ? video.videoTags.map(tag => `<span class="pill">${tag}</span>`).join('') : ''}</div>
          </div>
        </div>
      `);
      
      // Segmente wrapper
      const $segments = $('<div class="segments">');
      video.transcription.segments.forEach((segment, index) => {
        const $container = $('<div class="segment-container">');
        renderSegment($container, segment, videoId, index);
        $segments.append($container);
      });
      $group.append($segments);
      
      $('.video-transcript').append($group);

      // Highlighting für das Video
      const $video = $('.video-group video')[0];
      if ($video) {
        $video.addEventListener('timeupdate', function() {
          const currentTime = this.currentTime;
          $('.video-group .text span').removeClass('highlight');
          
          $('.video-group .text span').each(function() {
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
          loadVideoContent(videoId);
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
    const $group = $span.closest('.video-group');
    const $video = $group.find('video')[0];
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
    const $group = $span.closest('.video-group');
    const $video = $group.find('video')[0];
    const $container = $span.closest('.segment-container');
    const videoId = $container.data('video-id');
    const segmentIndex = $container.data('segment-index');
    const sentenceIndex = $span.index();
    const startTime = parseFloat($span.data('start'));
    const endTime = parseFloat($span.data('end'));
    const originalText = $span.text().trim();
    
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
}); */