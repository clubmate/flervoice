const express = require('express');
const mongoose = require('mongoose');

const videoRoutes = require('./routes/videoRoutes');

// INIT APP
const app = express();
app.use(express.json());

// INIT ROUTES
app.use(express.static(__dirname + '/views'));
app.use('/api/video', videoRoutes)

// INIT SERVERs
app.listen(3001, 'localhost', () => {
    console.log('server started.')
})

// INIT DATABASE
mongoose.connect('mongodb://127.0.0.1:27017/flersucker');
const database = mongoose.connection

database.on('error', (error) => {
    console.log(error)
})

database.once('connected', () => {
    console.log('database connected.');
})