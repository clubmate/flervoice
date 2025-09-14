
const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema(
  {
    title: String,
  }
)

module.exports = mongoose.model('videos', videoSchema)
