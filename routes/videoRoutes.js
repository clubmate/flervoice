const express = require('express');
const router = express.Router();

const video = require('../models/video');

// FIND VIDEO
router.get('/find', async (req, res) => {
  try {
    const { videoId } = req.query;

    const videoData = await video.findById(videoId);

    // SEND RESPONSE  
    res.json(videoData)
  }
  catch (error) {
    logger.error(`Error in /video/find: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;