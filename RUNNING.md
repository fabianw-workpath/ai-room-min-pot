# Running the Meeting Transcript App

This document explains how to run the Meeting Transcript App locally and with Docker.

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for containerized deployment)
- Recall.ai API key

## Local Development

### 1. Install Dependencies

Run the setup script to install all dependencies:

```bash
./setup.sh
```

Or manually install dependencies:

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd src/frontend
npm install
cd ../..
```

### 2. Configure Environment Variables

Make sure your `.env` file is properly configured with your Recall.ai API key:

```
RECALLAI_API_KEY=your_api_key_here
```

### 3. Start the Development Server

```bash
npm run dev
```

This will start both the backend server and the frontend development server concurrently.

- Backend will be available at: http://localhost:3000
- Frontend will be available at: http://localhost:3001

## Docker Deployment

### 1. Build and Run with Docker Compose

```bash
docker-compose up --build
```

This will build the Docker image and start the container with both the backend and Redis running together.

The application will be available at: http://localhost:3000

### 2. Stop the Container

```bash
docker-compose down
```

## Using the Application

1. Open the application in your browser
2. Enter a meeting URL (e.g., a Zoom or Google Meet URL)
3. Click "Create Meeting" to start capturing the transcript
4. The last word from the meeting transcript will be displayed in real-time
