# Meeting Transcript App

A minimal dockerized application that gets transcripts from meetings using the Recall.ai API.

## Features

- Create meetings by providing a meeting URL
- Real-time display of the last word from the meeting transcript
- Redis database for fast real-time updates
- Single Docker container deployment

## Tech Stack

- Frontend: TypeScript with Shadcn UI
- Backend: Node.js with Express
- Database: Redis
 - Persistence: AOF
- Containerization: Docker

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Recall.ai API key

### Installation

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your Recall.ai API key
3. Run `docker-compose up`
4. Access the application at http://localhost:3000

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Deployment

The application is designed to be deployed locally first, with future plans for AWS deployment.

```bash
docker-compose up -d
```