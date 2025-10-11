# FLERVOICE

A web application for managing and transcribing videos, built with Node.js, Express, MongoDB, and jQuery. It allows users to upload videos with transcriptions, edit speakers, tags, and sentences, search through content, and use a training mode for annotation.

## Features

- **Video Upload**: Upload MP4 videos along with JSON transcription files.
- **Transcription Management**: Display video transcriptions with segments, speakers, and tags.
- **Editing Capabilities**:
  - Edit speaker names for segments.
  - Add, edit, or delete tags for segments.
  - Edit sentence text with automatic word highlighting.
  - Split segments at specific sentences.
  - Merge segments with the same speaker.
- **Search Functionality**: Full-text search across all video transcriptions, displaying relevant segments with highlighted search terms.
- **Tag-Based Views**: Click on tags in the sidebar to view all segments containing that tag across videos.
- **Training Mode**: A special view for annotating sentences as "good" or "bad" for training data, with automatic looping and word highlighting.
- **Video Playback**: Integrated video player with time-jumping to sentences and highlighting of current words.
- **Responsive UI**: Dark-themed interface with collapsible sidebar and modern design.

## Technologies Used

- **Backend**: Node.js, Express.js, MongoDB with Mongoose, Multer for file uploads.
- **Frontend**: jQuery, SweetAlert2 for modals, Bootstrap Icons, Custom CSS.
- **Database**: MongoDB for storing video metadata and transcriptions.
- **File Storage**: Local file system for video files.

## Installation

### Prerequisites

- Node.js (version 14 or higher)
- MongoDB (running locally or remotely)
- npm or yarn

### Steps

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/clubmate/flersucker-web.git
   cd flersucker-web
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Set Up MongoDB**:
   - Ensure MongoDB is running on your system (default port 27017).
   - The app connects to `mongodb://localhost:27017/flersucker-web` by default. Update the connection string in `app.js` if needed.

4. **Create Media Directory**:
   - Create a `media` directory in the project root for storing uploaded video files.
   ```bash
   mkdir media
   ```

5. **Configure Environment (Optional)**:
   - If needed, set environment variables for database URL, port, etc., in a `.env` file.

6. **Start the Server**:
   ```bash
   npm start
   ```
   - The app will run on `http://localhost:3000` by default.

7. **Access the Application**:
   - Open your browser and navigate to `http://localhost:3000`.
   - Upload videos via the upload button in the header.

### Production Deployment

For production deployment on a server:

1. **Install Node.js and MongoDB** on your server.
2. **Clone and Install** as above.
3. **Use a Process Manager** like PM2:
   ```bash
   npm install -g pm2
   pm2 start app.js --name flersucker-web
   pm2 startup
   pm2 save
   ```
4. **Configure Reverse Proxy** (e.g., with Nginx) to serve the app on port 80/443.
5. **Secure the App**: Use HTTPS, set up firewall rules, and ensure MongoDB is secured.
6. **File Storage**: For large-scale use, consider using cloud storage (e.g., AWS S3) instead of local files.

## Usage

### Uploading Videos

- Click the upload button in the header.
- Select an MP4 file and a JSON file containing the transcription data.
- The JSON should have a structure like:
  ```json
  {
    "title": "Video Title",
    "uploader": "Uploader Name",
    "upload_date": "20230908",
    "segments": [
      {
        "text": "Sentence text",
        "start": 0.0,
        "end": 5.0
      }
    ]
  }
  ```

### Viewing and Editing Transcriptions

- Click on a video in the sidebar to load its transcription.
- **Edit Speakers**: Click on speaker pills to change names.
- **Edit Tags**: Click on tag pills to add/edit tags.
- **Edit Sentences**: Double-click on sentence text to edit.
- **Split Segments**: Right-click on a sentence to split the segment.
- **Jump to Time**: Click on a sentence to jump the video to that time.

### Searching

- Use the search bar in the header to perform full-text search.
- Results show segments containing the search term, with the term highlighted.

### Tag Views

- Click on tags in the sidebar to view all segments with that tag across videos.

### Training Mode

- Toggle to "TRAINING" mode using the button in the header.
- Annotate sentences as "good" or "bad" for training data.
- The video loops automatically, and words are highlighted.

## API Endpoints

- `GET /api/video/list`: Get list of all videos.
- `GET /api/video/show/:id`: Get details of a specific video.
- `POST /api/video/upload`: Upload a video with transcription.
- `PUT /api/video/update-transcription/:id`: Update transcription (split/merge).
- `PUT /api/video/update-speaker/:id`: Update speaker for a segment.
- `PUT /api/video/update-sentence/:id`: Update sentence text.
- `PUT /api/video/update-tag/:id`: Add/update/delete tags.
- `PUT /api/video/update-video-tags/:id`: Update video-level tags.
- `PUT /api/video/update-title/:id`: Update video title.
- `GET /api/video/tags`: Get all tags with counts.
- `GET /api/video/search-segments-by-tag/:tag`: Get segments by tag.
- `GET /api/video/search-segments/:query`: Get segments by search query.

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature-name`.
3. Commit changes: `git commit -am 'Add feature'`.
4. Push to the branch: `git push origin feature-name`.
5. Submit a pull request.

Please ensure code follows the existing style and includes tests if applicable.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues or questions, open an issue on GitHub or contact the maintainer.