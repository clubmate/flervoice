const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const video = require('../models/video');

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
    cb(null, datePrefix + '_' + file.originalname);
  }
});
const upload = multer({ storage });

// UPLOAD
router.post('/upload', upload.fields([{ name: 'mp4', maxCount: 1 }, { name: 'json', maxCount: 1 }]), async (req, res) => {
  try {
    const jsonFile = req.files.json[0];
    const jsonData = JSON.parse(fs.readFileSync(jsonFile.path, 'utf8'));
    console.log('JSON-Inhalt:', jsonData);

    // SEND RESPONSE  
    //res.json(videoData)
  }
  catch (error) {
    console.log(`Error in /video/upload: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;