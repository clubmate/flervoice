const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const video = require('../models/video');


// LIST ALL VIDEOS
router.get('/list', async (req, res) => {
  try {
    const videos = await video.find();
    res.status(200).json(videos);
  } catch (error) {
    console.log(`Error in /list: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
});

// SHOW SINGLE VIDEO
router.get('/show/:id', async (req, res) => {
  try {
    const videoData = await video.findById(req.params.id);
    if (!videoData) {
      return res.status(404).json({ message: 'Video nicht gefunden' });
    }
    res.status(200).json(videoData);
  } catch (error) {
    console.log(`Error in /videos/:id: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
});

// UPDATE TRANSCRIPTION
router.put('/update-transcription/:id', async (req, res) => {
  try {
    const { segmentIndex, sentenceIndex, newSpeaker } = req.body;
    const videoData = await video.findById(req.params.id);
    if (!videoData) {
      return res.status(404).json({ message: 'Video nicht gefunden' });
    }
    
    const segments = videoData.transcription.segments;
    if (segmentIndex >= segments.length) {
      return res.status(400).json({ message: 'Ungültiger Segment-Index' });
    }
    
    const segment = segments[segmentIndex];
    if (sentenceIndex >= segment.sentences.length) {
      return res.status(400).json({ message: 'Ungültiger Sentence-Index' });
    }
    
    // Prüfe, ob newSpeaker gleich dem aktuellen Speaker ist
    if (newSpeaker === segment.speaker) {
      return res.status(400).json({ message: 'Speaker ist gleich dem aktuellen Segment, Splitting nicht nötig' });
    }
    
    // Split the sentences
    const beforeSentences = segment.sentences.slice(0, sentenceIndex);
    const afterSentences = segment.sentences.slice(sentenceIndex);
    
    // Update the current segment with before sentences
    segment.sentences = beforeSentences;
    
    // Create new segment with after sentences, new speaker, and copied tags
    const newSegment = {
      speaker: newSpeaker,
      tags: segment.tags, // Tags vom alten Segment übernehmen
      sentences: afterSentences
    };
    
    // Insert the new segment after the current one
    segments.splice(segmentIndex + 1, 0, newSegment);
    
    // Save
    await video.findByIdAndUpdate(req.params.id, { 'transcription.segments': segments });
    
    res.status(200).json({ message: 'Transkription aktualisiert' });
  } catch (error) {
    console.log(`Error in /update-transcription/:id: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
});

// UPDATE SENTENCE TEXT AND WORDS
router.put('/update-sentence/:id', async (req, res) => {
  try {
    const { segmentIndex, sentenceIndex, newText, newWords, training } = req.body;
    
    const videoData = await video.findById(req.params.id);
    if (!videoData) {
      return res.status(404).json({ message: 'Video nicht gefunden' });
    }
    
    const segments = videoData.transcription.segments;
    if (segmentIndex >= segments.length || sentenceIndex >= segments[segmentIndex].sentences.length) {
      return res.status(400).json({ message: 'Ungültiger Index' });
    }
    
    const sentence = segments[segmentIndex].sentences[sentenceIndex];
    const words = sentence.words || [];
    
    // Neuer Text und Words generieren, falls newText vorhanden
    if (newText) {
      sentence.text = newText;
      const newWordsArray = newText.split(' ');
      
      // Map für bestehende Timestamps erstellen (Wort zu Timestamp)
      const wordMap = {};
      words.forEach(w => {
        if (!wordMap[w.word]) {
          wordMap[w.word] = { start: w.start, end: w.end };
        }
      });
      
      // Words-Array aktualisieren: Timestamps für übereinstimmende Wörter behalten, neue bekommen 0
      sentence.words = newWordsArray.map(word => ({
        word: word,
        start: wordMap[word] ? wordMap[word].start : 0,
        end: wordMap[word] ? wordMap[word].end : 0
      }));
    }
    
    // Training setzen, falls vorhanden
    if (training !== undefined) {
      sentence.training = training;
    }
    
    // DB aktualisieren
    await video.findByIdAndUpdate(req.params.id, { 'transcription.segments': segments });
    
    res.status(200).json({ message: 'Sentence aktualisiert' });
  } catch (error) {
    console.log(`Error in /update-sentence/:id: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
});

// UPDATE VIDEO TAGS
router.put('/update-video-tags/:id', async (req, res) => {
  try {
    const { videoTags } = req.body;
    const upperTags = videoTags.map(tag => tag.toUpperCase()); // UPPERCASE STELLEN
    const videoData = await video.findByIdAndUpdate(req.params.id, { videoTags: upperTags }, { new: true });
    if (!videoData) {
      return res.status(404).json({ message: 'Video nicht gefunden' });
    }
    res.status(200).json({ message: 'Video-Tags aktualisiert' });
  } catch (error) {
    console.log(`Error in /update-video-tags/:id: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
});

// GET ALL TAGS SORTED BY FREQUENCY
router.get('/tags', async (req, res) => {
  try {
    const videoData = await video.find({}, 'transcription.segments.tags');
    const tagCount = {};
    
    videoData.forEach(video => {
      video.transcription.segments.forEach(segment => {
        segment.tags.forEach(tag => {
          tagCount[tag] = (tagCount[tag] || 0) + 1;
        });
      });
    });
    
    // Sortieren und als Array mit Tag und Count zurückgeben
    const sortedTags = Object.keys(tagCount)
      .sort((a, b) => tagCount[b] - tagCount[a])
      .map(tag => ({ tag, count: tagCount[tag] }));
    
    res.status(200).json(sortedTags);
  } catch (error) {
    console.log(`Error in /tags: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
});

// GET ALL TAGS
router.get('/all-tags', async (req, res) => {
  try {
    const videos = await video.find({}, 'transcription.segments.tags');
    const tagCount = {};
    
    videos.forEach(video => {
      video.transcription.segments.forEach(segment => {
        segment.tags.forEach(tag => {
          tagCount[tag] = (tagCount[tag] || 0) + 1;
        });
      });
    });
    
    const allTags = Object.keys(tagCount).sort((a, b) => tagCount[b] - tagCount[a]);
    
    res.status(200).json(allTags);
  } catch (error) {
    console.log(`Error in /all-tags: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
});

// ADD TAG TO SEGMENT
router.put('/add-tag/:id', async (req, res) => {
  try {
    const { segmentIndex, newTag } = req.body;
    const videoData = await video.findById(req.params.id);
    if (!videoData) {
      return res.status(404).json({ message: 'Video nicht gefunden' });
    }
    
    const segments = videoData.transcription.segments;
    if (segmentIndex >= segments.length) {
      return res.status(400).json({ message: 'Ungültiger Segment-Index' });
    }
    
    // Tag hinzufügen, falls nicht schon vorhanden
    if (!segments[segmentIndex].tags.includes(newTag)) {
      segments[segmentIndex].tags.push(newTag);
    }
    
    // DB aktualisieren
    await video.findByIdAndUpdate(req.params.id, { 'transcription.segments': segments });
    
    res.status(200).json({ message: 'Tag hinzugefügt' });
  } catch (error) {
    console.log(`Error in /add-tag/:id: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
});

// UPDATE OR DELETE TAG IN SEGMENT
router.put('/update-tag/:id', async (req, res) => {
  try {
    const { segmentIndex, oldTag, newTag, deleteTag } = req.body;
    const videoData = await video.findById(req.params.id);
    if (!videoData) {
      return res.status(404).json({ message: 'Video nicht gefunden' });
    }
    
    const segments = videoData.transcription.segments;
    if (segmentIndex >= segments.length) {
      return res.status(400).json({ message: 'Ungültiger Segment-Index' });
    }
    
    const tagIndex = segments[segmentIndex].tags.indexOf(oldTag);
    if (tagIndex === -1) {
      return res.status(400).json({ message: 'Tag nicht gefunden' });
    }
    
    if (deleteTag) {
      // Tag löschen
      segments[segmentIndex].tags.splice(tagIndex, 1);
    } else {
      // Tag bearbeiten
      segments[segmentIndex].tags[tagIndex] = newTag;
    }
    
    // DB aktualisieren
    await video.findByIdAndUpdate(req.params.id, { 'transcription.segments': segments });
    
    res.status(200).json({ message: deleteTag ? 'Tag gelöscht' : 'Tag aktualisiert' });
  } catch (error) {
    console.log(`Error in /update-tag/:id: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
});

// REMOVE TAG FROM SEGMENT
router.put('/remove-tag/:id', async (req, res) => {
  try {
    const { segmentIndex, tagToRemove } = req.body;
    
    const videoData = await video.findById(req.params.id);
    if (!videoData) {
      return res.status(404).json({ message: 'Video nicht gefunden' });
    }
    
    const segments = videoData.transcription.segments;
    if (segmentIndex >= segments.length) {
      return res.status(400).json({ message: 'Ungültiger Segment-Index' });
    }
    
    const segment = segments[segmentIndex];
    segment.tags = segment.tags.filter(tag => tag !== tagToRemove);
    
    await video.findByIdAndUpdate(req.params.id, { 'transcription.segments': segments });
    
    res.status(200).json({ message: 'Tag entfernt' });
  } catch (error) {
    console.log(`Error in /remove-tag/:id: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
});

// UPDATE SPEAKER FOR A SEGMENT
router.put('/update-speaker/:id', async (req, res) => {
  try {
    let { segmentIndex, newSpeaker } = req.body;
    
    const videoData = await video.findById(req.params.id);
    if (!videoData) {
      return res.status(404).json({ message: 'Video nicht gefunden' });
    }
    
    const segments = videoData.transcription.segments;
    if (segmentIndex >= segments.length) {
      return res.status(400).json({ message: 'Ungültiger Segment-Index' });
    }
    
    // Ändere den Speaker
    segments[segmentIndex].speaker = newSpeaker;
    
    // Mergen mit vorherigem Segment, wenn Speaker gleich
    if (segmentIndex > 0 && segments[segmentIndex - 1].speaker === newSpeaker) {
      segments[segmentIndex - 1].sentences = segments[segmentIndex - 1].sentences.concat(segments[segmentIndex].sentences);
      segments.splice(segmentIndex, 1);
      segmentIndex--; // Index anpassen
    }
    
    // Mergen mit nächstem Segment, wenn Speaker gleich
    if (segmentIndex + 1 < segments.length && segments[segmentIndex + 1].speaker === newSpeaker) {
      segments[segmentIndex].sentences = segments[segmentIndex].sentences.concat(segments[segmentIndex + 1].sentences);
      segments.splice(segmentIndex + 1, 1);
    }
    
    // Speichere
    await video.findByIdAndUpdate(req.params.id, { 'transcription.segments': segments });
    
    res.status(200).json({ message: 'Speaker aktualisiert und gemergt' });
  } catch (error) {
    console.log(`Error in /update-speaker/:id: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
});

// GET SEGMENTS BY TAG FROM ALL VIDEOS
router.get('/search-segments-by-tag/:tag', async (req, res) => {
  try {
    const tag = req.params.tag;
    const videoData = await video.find({}, 'title uploader filename transcription.segments');
    const matchingSegments = [];
    
    videoData.forEach(video => {
      video.transcription.segments.forEach((segment, segmentIndex) => {
        if (segment.tags.includes(tag)) {
          matchingSegments.push({
            videoId: video._id,
            videoTitle: video.title,
            videoTags: video.videoTags,
            videoUploader: video.uploader,
            videoFilename: video.filename, // Filename hinzufügen
            segmentIndex,
            speaker: segment.speaker,
            tags: segment.tags,
            sentences: segment.sentences
          });
        }
      });
    });
    
    res.status(200).json(matchingSegments);
  } catch (error) {
    console.log(`Error in /search-segments-by-tag/:tag: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
});

// GET SEGMENTS BY SEARCH QUERY FROM ALL VIDEOS
router.get('/search-segments/:query', async (req, res) => {
  try {
    const query = req.params.query.toLowerCase();
    const videoData = await video.find({}, 'title uploader filename transcription.segments');
    const matchingSegments = [];
    const addedSegments = new Set(); // Um Duplikate zu vermeiden
    
    videoData.forEach(video => {
      video.transcription.segments.forEach((segment, segmentIndex) => {
        const key = `${video._id}-${segmentIndex}`;
        if (!addedSegments.has(key) && segment.sentences.some(s => s.text.toLowerCase().includes(query))) {
          matchingSegments.push({
            videoId: video._id,
            videoTitle: video.title,
            videoTags: video.videoTags,
            videoUploader: video.uploader,
            videoFilename: video.filename,
            segmentIndex,
            speaker: segment.speaker,
            tags: segment.tags,
            sentences: segment.sentences // Komplettes Segment
          });
          addedSegments.add(key);
        }
      });
    });
    
    res.status(200).json(matchingSegments);
  } catch (error) {
    console.log(`Error in /search-segments/:query: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
});

// UPDATE VIDEO TITLE
router.put('/update-title/:id', async (req, res) => {
  try {
    const { newTitle } = req.body;
    const videoData = await video.findByIdAndUpdate(req.params.id, { title: newTitle }, { new: true });
    if (!videoData) {
      return res.status(404).json({ message: 'Video nicht gefunden' });
    }
    res.status(200).json({ message: 'Titel aktualisiert' });
  } catch (error) {
    console.log(`Error in /update-title/:id: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
});


// Funktion zum Bereinigen des Filenames
function sanitizeFilename(name) {
  return name
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-zA-Z0-9.-]/g, '_'); // Ersetze andere Sonderzeichen mit _
}

// Multer-Konfiguration für Datei-Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../media/'));
  },
  filename: (req, file, cb) => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const datePrefix = day + month + year;
    const sanitizedName = sanitizeFilename(file.originalname);
    cb(null, datePrefix + '_' + sanitizedName);
  }
});
const upload = multer({ storage });

// UPLOAD
router.post('/upload', upload.fields([{ name: 'mp4', maxCount: 1 }, { name: 'json', maxCount: 1 }]), async (req, res) => {
  try {
    const jsonFile = req.files.json[0];
    const jsonData = JSON.parse(fs.readFileSync(jsonFile.path, 'utf8'));

    const newVideo = new video({ 
      title: jsonData.title,
      description: jsonData.description,
      uploader: jsonData.uploader,
      uploadDate: jsonData.upload_date,
      videoId: jsonData.video_id,
      model: jsonData.model,
      filename: req.files.mp4[0].filename,
      transcription: {
        segments: { speaker: "FLER", sentences: jsonData.segments }
      }
    });
    await newVideo.save();

    // SEND RESPONSE  
    //res.json(videoData)
  }
  catch (error) {
    console.log(`Error in /video/upload: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
});

// GET TOP 20 MOST USED TAGS
router.get('/top-tags', async (req, res) => {
  try {
    const videos = await video.find({}, 'transcription.segments.tags');
    const tagCount = {};
    
    videos.forEach(video => {
      video.transcription.segments.forEach(segment => {
        segment.tags.forEach(tag => {
          tagCount[tag] = (tagCount[tag] || 0) + 1;
        });
      });
    });
    
    const topTags = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag]) => tag);
    
    res.status(200).json(topTags);
  } catch (error) {
    console.log(`Error in /top-tags: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;