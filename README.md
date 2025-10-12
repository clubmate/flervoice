# FLERVOICE

A web application for managing and transcribing videos, built with Node.js, Express, MongoDB, and jQuery. It allows users to upload videos with transcriptions, edit speakers, tags, and sentences, search through content, and use a training mode for annotation.

## Installation

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

6. **Start the Server**:
   ```bash
   npm start
   ```
   - The app will run on `http://localhost:3001` by default.

7. **Access the Application**:
   - Open your browser and navigate to `http://localhost:3001`.
