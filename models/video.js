
const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    uploader: String,
    uploadDate: String,
    videoId: String,
    model: String,
    filename: String,
    transcription: {
      segments: [{
        speaker: String,
        tags: [],
        sentences: []
      }]
    }
  }
)

module.exports = mongoose.model('videos', videoSchema)
