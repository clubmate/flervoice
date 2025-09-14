const express = require('express');
const mongoose = require('mongoose');

const channelRoutes = require('./routes/channelRoutes');

// INIT APP
const app = express();
app.use(express.json());

// INIT ROUTES
app.use(express.static(__dirname + '/views'));
app.use('/api/playlist', playlistRoutes)

// INIT SERVER
app.listen(3000, 'localhost', () => {
    logger.info('server started.')
})

// INIT DATABASE
mongoose.connect('mongodb://127.0.0.1:27017/flersucker');
const database = mongoose.connection

database.on('error', (error) => {
    logger.error(error)
})

database.once('connected', () => {
    logger.info('database connected.');
})