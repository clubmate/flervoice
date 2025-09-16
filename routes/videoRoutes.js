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
        segments: { sentences: jsonData.segments }
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