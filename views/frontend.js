let currentVideoId = null;
let currentView = 'normal';
let currentLoopHandler = null;
let currentTag = null;

// LOAD SIDEBAR VIDEOS
async function loadVideos() {
  try {
    const response = await fetch('/api/video/list');
    const videos = await response.json();
      
    $('#videoList').empty();
      
    videos.forEach(video => {
      const title = video.title.length > 45 ? video.title.substring(0, 45) + '...' : video.title;
      const $link = $('<a>', {
        'data-id': video._id,
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
          currentTag = null;
          $('#tagList a').removeClass('active');
          if (currentView === 'normal') {
            loadVideoContent(video._id);
          } else {
            loadVideoContentTraining(video._id);
          }
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
        currentTag = tag;
        $('#tagList a').removeClass('active');
        $(this).addClass('active');
        $('#videoList a').removeClass('active'); 
        loadSegmentsByTag(tag);
      });

      $('#tagList').append($tag);
    });

    // HERVORHEBUNG SETZEN, FALLS AKTUELLER TAG
    if (currentTag) {
      $('#tagList a').filter(function() {
        return $(this).data('tag') === currentTag;
      }).addClass('active');
    }

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
  const noflerClass = segment.speaker === 'FLER' ? '' : 'no-fler';
  $container.append(`<div class="tags ${noflerClass}"></div>`);
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

    currentVideoId = videoId;

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
        <div class="top-tags"></div>
      </div>
    `);

    // TOP TAGS
    const $topTags = $group.find('.top-tags');
    // Lade Top-Tags
    fetch('/api/video/top-tags')
      .then(response => response.json())
      .then(topTags => {
        topTags.forEach(tag => {
          $topTags.append(`<span class="pill top-tag">${tag}</span>`);
        });
      });

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

    // VIEW-TOGGLE AKTIVIEREN IN NORMALER ANSICHT
    $('#view-toggle').prop('disabled', false);

  } catch (error) {
    console.error('Fehler beim Laden des Video-Inhalts:', error);
  }
}

// LOAD VIDEO CONTENT FOR TRAINING VIEW
async function loadVideoContentTraining(videoId) {
  try {
    const response = await fetch(`/api/video/show/${videoId}`);
    const video = await response.json();

    currentVideoId = videoId;

    $('main').empty();
    const $group = $('<section class="training">');
    
    // COUNT CONTAINER
    $group.append(`<div class="video-count"></div>`);

    // VIDEO-PLAYER
    $group.append(`
      <div class="video-player">
        <div class="video-info">
          <video controls>
            <source src="/media/${video.filename}" type="video/mp4">
          </video>
        </div>
      </div>
    `);

    // SENTENCE CONTAINER
    $group.append(`<div class="video-sentence"></div>`);
    
    $('main').append($group);

    // Initial Sentence laden
    updateTrainingSentence();

    // VIEW-TOGGLE AKTIVIEREN IN TRAINING-ANSICHT
    $('#view-toggle').prop('disabled', false);

  } catch (error) {
    console.error('Fehler beim Laden des Video-Inhalts (Training):', error);
  }
}

// UPDATE TRAINING SENTENCE (ohne Video neu zu laden)
async function updateTrainingSentence() {
  try {
    const response = await fetch(`/api/video/show/${currentVideoId}`);
    const video = await response.json();

    // Sammle alle Sentences mit Indizes
    const allSentences = [];
    let trainingTrue = 0;
    let trainingFalse = 0;
    video.transcription.segments.forEach((segment, segmentIndex) => {
      if (segment.speaker === 'FLER') {
        segment.sentences.forEach((sentence, sentenceIndex) => {
          if (sentence.training === true) trainingTrue++;
          else if (sentence.training === false) trainingFalse++;
          else if (sentence.training === undefined || sentence.training === null) {
            allSentences.push({ ...sentence, segmentIndex, sentenceIndex });
          }
        });
      }
    });

    // Anzahl anzeigen
    $('.video-count').html(`<div><i class="bi bi-patch-check-fill"></i> ${trainingTrue}</div><div><i class="bi bi-trash3-fill"></i> ${trainingFalse}</div><div><i class="bi bi-hourglass-split"></i> ${allSentences.length}</div>`);

    // Zufällige Sentence auswählen
    const randomSentence = allSentences[Math.floor(Math.random() * allSentences.length)];

    // SENTENCE ANZEIGEN MIT INPUT UND BUTTON
    $('.video-sentence').html(`
      <textarea id="sentence-input">${randomSentence ? randomSentence.text : ''}</textarea>
      <button id="save-sentence" disabled><i class="bi bi-check-circle-fill"></i></button>
      <div class="training-buttons">
        <button id="training-good"><i class="bi bi-patch-check-fill"></i> GOOD</button>
        <button id="training-bad"><i class="bi bi-trash3-fill"></i> BAD</button>
      </div>
    `);

    // LOOP UND HIGHLIGHTING FÜR DIE ZUFÄLLIGE SENTENCE
    if (randomSentence && randomSentence.start !== undefined && randomSentence.end !== undefined) {
      const $video = $('.video-player video')[0];
      if ($video) {
        // Entferne alten Handler
        if (currentLoopHandler) {
          $video.removeEventListener('timeupdate', currentLoopHandler);
        }
        
        // Neuer Handler
        currentLoopHandler = () => {
          if ($video.currentTime >= randomSentence.end) {
            $video.currentTime = randomSentence.start;
          }
        };
        
        $video.addEventListener('timeupdate', currentLoopHandler);
        
        // Springe zur Zeit und spiele ab, wenn Video bereit
        if ($video.readyState >= 2) { // HAVE_CURRENT_DATA
          $video.currentTime = randomSentence.start;
          $video.play();
        } else {
          $video.addEventListener('canplay', function onCanPlay() {
            $video.currentTime = randomSentence.start;
            $video.play();
            $video.removeEventListener('canplay', onCanPlay);
          });
        }
      }
    }

    // EVENT FÜR INPUT ÄNDERUNG
    $('#sentence-input').on('input', function() {
      const newText = $(this).val().trim();
      const originalText = randomSentence ? randomSentence.text : '';
      $('#save-sentence').prop('disabled', newText === originalText);
    });

    // EVENT FÜR SPEICHERN
    $('#save-sentence').on('click', async function() {
      const newText = $('#sentence-input').val().trim();
      if (newText && newText !== randomSentence.text) {
        $(this).prop('disabled', true);
        const newWords = newText.split(' ').filter(word => word);
        await fetch(`/api/video/update-sentence/${currentVideoId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ segmentIndex: randomSentence.segmentIndex, sentenceIndex: randomSentence.sentenceIndex, newText, newWords })
        });
      }
    });

    // EVENT FÜR GOOD
    $('#training-good').on('click', async function() {
      await fetch(`/api/video/update-sentence/${currentVideoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentIndex: randomSentence.segmentIndex, sentenceIndex: randomSentence.sentenceIndex, training: true })
      });
      updateTrainingSentence();
    });

    // EVENT FÜR BAD
    $('#training-bad').on('click', async function() {
      await fetch(`/api/video/update-sentence/${currentVideoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentIndex: randomSentence.segmentIndex, sentenceIndex: randomSentence.sentenceIndex, training: false })
      });
      updateTrainingSentence();
    });

  } catch (error) {
    console.error('Fehler beim Aktualisieren der Sentence:', error);
  }
}

// EDIT VIDEO TITLE
function editVideoTitle($title) {
  const $link = $title.closest('a');
  const videoId = $link.data('id');
  const currentTitle = $title.text().toLowerCase();

  Swal.fire({
    title: 'EDIT VIDEO TITLE',
    input: 'text',
    inputValue: currentTitle,
    inputPlaceholder: 'NEW TITLE',
    showCancelButton: true,
    confirmButtonText: 'SAVE',
    cancelButtonText: 'CANCEL'
  }).then(async (result) => {
    if (result.isConfirmed && result.value && result.value !== currentTitle) {
      const newTitle = result.value.trim();
      await fetch(`/api/video/update-title/${videoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newTitle })
      });
      loadVideos(); // Liste neu laden
    }
  });
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

// JUMP TO SENTENCE TIME
function jumpToSentenceTime($span) {
  const $group = $span.parents('section').eq(1);
  const $video = $group.find('video')[0];
  if ($video) {
    const startTime = parseFloat($span.data('start'));
    if (!isNaN(startTime)) {
      $video.currentTime = startTime;
      $video.play();
    }
  }
}

// EDIT SENTENCE TEXT
function editSentenceText($span) {
  const $group = $span.parents('section').eq(1);
  const $video = $group.find('video')[0];
  const $container = $span.closest('[data-video-id]');
  const videoId = $container.data('video-id');
  const segmentIndex = $container.data('segment-index');
  const sentenceIndex = $span.index();
  const startTime = parseFloat($span.data('start'));
  const endTime = parseFloat($span.data('end'));
  const originalText = $span.text().trim();
  
  const currentTimeBefore = $video ? $video.currentTime : 0;
  const wasPlaying = $video ? !$video.paused : false;
  
  $video.currentTime = startTime;
  let loopActive = true;
  const loopHandler = () => {
    if (loopActive && $video.currentTime >= endTime) {
      $video.currentTime = startTime;
    }
  };
  $video.addEventListener('timeupdate', loopHandler);
    
  Swal.fire({
    title: 'EDIT SENTENCE',
    input: 'text',
    inputValue: originalText,
    inputPlaceholder: 'NEW TEXT',
    showCancelButton: true,
    confirmButtonText: 'SAVE',
    cancelButtonText: 'CANCEL',
    willClose: () => {
      loopActive = false;
      $video.removeEventListener('timeupdate', loopHandler);
    }
    }).then(async (result) => {
      if (result.isConfirmed && result.value && result.value !== originalText) {
        const newText = result.value.trim();
        const newWords = newText.split(' ').filter(word => word);
        await fetch(`/api/video/update-sentence/${videoId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ segmentIndex, sentenceIndex, newText, newWords })
        });
        
        $span.text(newText + ' ');
      }
    });
}

// LOAD SEGMENTS BY TAG
async function loadSegmentsByTag(tag) {
  try {
    const response = await fetch(`/api/video/search-segments-by-tag/${encodeURIComponent(tag)}`);
    const segments = await response.json();
    
    $('main').empty();
    
    // Segmente nach Video gruppieren
    const grouped = segments.reduce((acc, segment) => {
      if (!acc[segment.videoId]) acc[segment.videoId] = [];
      acc[segment.videoId].push(segment);
      return acc;
    }, {});
    
    // Für jede Gruppe rendern
    Object.values(grouped).forEach(group => {
      const $group = $('<section>');
      
      // VIDEO-PLAYER FÜR DIE GRUPPE
      $group.append(`
        <div class="video-player">
          <div class="video-info">
            <video controls>
              <source src="/media/${group[0].videoFilename}" type="video/mp4">
            </video>
            <strong>${group[0].videoTitle}</strong>
            <div class="video-tags">${group[0].videoTags ? group[0].videoTags.map(tag => `<span class="pill">${tag}</span>`).join('') : ''}</div>
          </div>
        </div>
      `);
      
      // SEGMENTS
      const $segments = $('<div class="video-segment">');
      group.forEach((segment, index) => {
        const $container = $('<section>');
        renderSegment($container, segment, segment.videoId, segment.segmentIndex);
        $segments.append($container);
      });
      $group.append($segments);
      
      $('main').append($group);
    });
    
    // HIGHLIGHTING FÜR JEDES VIDEO
    $('main section video').each(function() {
      $(this).on('timeupdate', function() {
        const currentTime = this.currentTime;
        const $group = $(this).closest('section');
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

    // PAUSE ANDERE VIDEOS WENN EINES SPIELT
    $('main section video').each(function() {
      $(this).on('play', function() {
        $('main section video').not(this).each(function() {
          this.pause();
        });
      });
    });

    // VIEW-TOGGLE DEAKTIVIEREN IN TAG-ANSICHT
    $('#view-toggle').prop('disabled', true);
    
  } catch (error) {
    console.error('Fehler beim Laden der Segmente:', error);
  }
}

// LOAD SEGMENTS BY SEARCH
async function loadSegmentsBySearch(query) {
  try {
    const response = await fetch(`/api/video/search-segments/${encodeURIComponent(query)}`);
    const segments = await response.json();
    
    $('main').empty();

    // Hervorhebungen entfernen
    $('#videoList a').removeClass('active');
    $('#tagList a').removeClass('active');
    currentVideoId = null;
    currentTag = null;
    
    // Segmente nach Video gruppieren
    const grouped = segments.reduce((acc, segment) => {
      if (!acc[segment.videoId]) acc[segment.videoId] = [];
      acc[segment.videoId].push(segment);
      return acc;
    }, {});
    
    // Für jede Gruppe rendern
    Object.values(grouped).forEach(group => {
      const $group = $('<section>');
      
      // VIDEO-PLAYER FÜR DIE GRUPPE
      $group.append(`
        <div class="video-player">
          <div class="video-info">
            <video controls>
              <source src="/media/${group[0].videoFilename}" type="video/mp4">
            </video>
            <strong>${group[0].videoTitle}</strong>
            <div class="video-tags">${group[0].videoTags ? group[0].videoTags.map(tag => `<span class="pill">${tag}</span>`).join('') : ''}</div>
          </div>
        </div>
      `);
      
      // SEGMENTS
      const $segments = $('<div class="video-segment">');
      group.forEach((segment, index) => {
        const $container = $('<section>');
        renderSegment($container, segment, segment.videoId, segment.segmentIndex);
        
        // HERVORHEBUNG DES SUCHWORTS
        $container.find('.text span').each(function() {
          const span = $(this);
          const text = span.text();
          if (text.toLowerCase().includes(query.toLowerCase())) {
            span.html(text.replace(new RegExp(query, 'gi'), '<mark>$&</mark>'));
          }
        });
        
        $segments.append($container);
      });
      $group.append($segments);
      
      $('main').append($group);
    });
    
    // HIGHLIGHTING FÜR JEDES VIDEO
    $('main section video').each(function() {
      $(this).on('timeupdate', function() {
        const currentTime = this.currentTime;
        const $group = $(this).closest('section');
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
    
    // PAUSE ANDERE VIDEOS WENN EINES SPIELT
    $('main section video').each(function() {
      $(this).on('play', function() {
        $('main section video').not(this).each(function() {
          this.pause();
        });
      });
    });
    
    // VIEW-TOGGLE DEAKTIVIEREN IN SUCH-ANSICHT
    $('#view-toggle').prop('disabled', true);
    
  } catch (error) {
    console.error('Fehler beim Laden der Segmente:', error);
  }
}

// ADD TOP TAG TO CURRENT SEGMENT
function addTopTagToCurrentSegment($pill) {
  const tag = $pill.text();
  const $section = $pill.closest('section');
  const $video = $section.find('video')[0];
  if ($video) {
    const currentTime = $video.currentTime;
    // Finde das Segment basierend auf currentTime
    const $container = $section.find('[data-video-id]').filter(function() {
      const $spans = $(this).find('.text span');
      for (let i = 0; i < $spans.length; i++) {
        const start = parseFloat($spans.eq(i).data('start'));
        const end = parseFloat($spans.eq(i).data('end'));
        if (currentTime >= start && currentTime < end) {
          return true;
        }
      }
      return false;
    });
    if ($container.length > 0) {
      const videoId = $container.data('video-id');
      const segmentIndex = $container.data('segment-index');
      // Tag hinzufügen
      fetch(`/api/video/add-tag/${videoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentIndex, newTag: tag })
      }).then(() => {
        loadVideoContent(videoId);
      });
    }
  }
}

// INIT NORMAL VIEW
function initNormalView() {
  if (currentVideoId) {
    loadVideoContent(currentVideoId);
  }
}

// INIT TRAINING VIEW
function initTrainingView() {
  if (currentVideoId) {
    loadVideoContentTraining(currentVideoId);
  } 
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

  // JUMP TO SENTENCE TIME
  $('main').on('click', '.text span', function() { jumpToSentenceTime($(this)); });

  // SPLIT SEGMENT
  $('main').on('contextmenu', '.text span', function(e) { e.preventDefault(); splitSegment($(this)); });

  // EDIT SENTENCE TEXT
  $('main').on('dblclick', '.text span', function() { editSentenceText($(this)); });

  // EDIT VIDEO TITLE ON DOUBLE CLICK
  $('#videoList').on('dblclick', '.video-title', function(e) { e.preventDefault(); editVideoTitle($(this)); });

  // SEARCH
  $('#search-input').on('keypress', function(e) {
    if (e.which === 13) {
      const query = $(this).val().trim();
      if (query) {
        loadSegmentsBySearch(query);
      }
    }
  });

  // VIEW TOGGLE
  $('#view-toggle').on('click', function() {
    currentView = currentView === 'normal' ? 'training' : 'normal';
    if (currentView === 'normal') {
      initNormalView();
      $(this).html('<i class="bi bi-tools"></i>');
    } else {
      initTrainingView();
      $(this).html('<i class="bi bi-list-ul"></i>');
    }
  });

  // ADD TAG TO CURRENT SEGMENT
  $('main').on('click', '.top-tag', function() { addTopTagToCurrentSegment($(this)); });

  // INIT NORMAL VIEW ON START
  loadVideos();
  loadTags();
    
});