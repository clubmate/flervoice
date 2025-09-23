
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
    },
    videoTags: [String]
  }
)

module.exports = mongoose.model('videos', videoSchema)
