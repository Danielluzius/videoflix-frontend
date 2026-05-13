# Videoflix Frontend

An Angular 19 frontend for the Videoflix video streaming platform.

## Tech Stack

- **Angular 19** (standalone components, signals)
- **TypeScript**
- **SCSS**
- **hls.js** for HLS video streaming
- **RxJS**

## Prerequisites

- Node.js >= 18
- Angular CLI >= 19

## Installation

```bash
npm install
```

## Development server

```bash
ng serve
```

Navigate to `http://localhost:4200/`.

## Backend

This frontend connects to a Django REST Framework backend.
Make sure the backend is running on `http://127.0.0.1:8000` before starting the dev server.

Backend repo: https://github.com/Danielluzius/videoflix-backend

## Build

```bash
ng build
```

Build artifacts will be stored in the `dist/` directory.
