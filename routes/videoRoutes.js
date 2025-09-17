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
    
    if (sentenceIndex !== undefined) {
      // Sentences verschieben (bestehende Logik)
      if (sentenceIndex >= segments[segmentIndex].sentences.length) {
        return res.status(400).json({ message: 'Ungültiger Sentence-Index' });
      }
      
      const newSegment = {
        speaker: newSpeaker,
        tags: segments[segmentIndex].tags,
        sentences: segments[segmentIndex].sentences.slice(sentenceIndex)
      };
      
      segments[segmentIndex].sentences = segments[segmentIndex].sentences.slice(0, sentenceIndex);
      segments.splice(segmentIndex + 1, 0, newSegment);
    } else {
      // Nur Speaker ändern
      segments[segmentIndex].speaker = newSpeaker;
    }
    
    // Automatisch Segmente mit gleichem Speaker zusammenführen
    for (let i = segments.length - 1; i > 0; i--) {
      if (segments[i].speaker === segments[i - 1].speaker) {
        // Sentences zusammenführen
        segments[i - 1].sentences = segments[i - 1].sentences.concat(segments[i].sentences);
        // Segment entfernen
        segments.splice(i, 1);
      }
    }
    
    // DB aktualisieren
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
    const { segmentIndex, sentenceIndex, newText } = req.body;
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
    
    // Neuer Text und Words generieren
    sentence.text = newText;
    const newWords = newText.split(' ');
    
    // Words-Array aktualisieren: Versuche, bestehende Timestamps zu erhalten
    sentence.words = newWords.map((word, index) => {
      const existingWord = words[index];
      return {
        start: existingWord ? existingWord.start : 0,
        end: existingWord ? existingWord.end : 0,
        word: word
      };
    });
    
    // DB aktualisieren
    await video.findByIdAndUpdate(req.params.id, { 'transcription.segments': segments });
    
    res.status(200).json({ message: 'Sentence aktualisiert' });
  } catch (error) {
    console.log(`Error in /update-sentence/:id: ${error.message}`);
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

module.exports = router;