# Videoflix Frontend

An Angular 19 single-page application for the Videoflix video streaming platform.
Users can browse, preview, and stream videos in adaptive quality (HLS) after logging in.

This project was developed as part of the Developer Akademie curriculum.

---

## Tech Stack

| Technology | Version | Purpose                                        |
| ---------- | ------- | ---------------------------------------------- |
| Angular    | 19.2    | SPA framework (standalone components, signals) |
| TypeScript | 5.7     | Language                                       |
| SCSS       | —       | Styling                                        |
| hls.js     | 1.6.16  | HLS adaptive streaming                         |
| Plyr       | 3.8.4   | Video player UI                                |
| RxJS       | 7.8     | Reactive state & HTTP                          |

---

## Prerequisites

- **Node.js** >= 18
- **Angular CLI** >= 19 (`npm install -g @angular/cli`)

---

## Quick Start

**Step 1 – Install dependencies:**

```bash
npm install
```

**Step 2 – Start the development server:**

```bash
ng serve
```

Navigate to `http://localhost:4200/`. The app reloads automatically on file changes.

> Make sure the [backend](../backend/) is running before starting the frontend.

---

## Configuration

API URL and HLS parameters are configured in `src/environments/environment.ts` (development) and `src/environments/environment.prod.ts` (production).

| Key             | Default                      | Description                          |
| --------------- | ---------------------------- | ------------------------------------ |
| `apiBaseUrl`    | `http://localhost:8000/api/` | Backend REST API base URL            |
| `toastDuration` | `2000`                       | Toast notification display time (ms) |
| `hls.*`         | various                      | HLS.js player tuning options         |

---

## Project Structure

```
src/
  app/
    core/
      guards/         # authGuard (protected routes), guestGuard (public-only routes)
      services/       # ApiService, AuthService, VideoService, ToastService
    features/
      home/           # Landing page
      auth/           # Login, Register, Activate, Forgot Password, Confirm Password
      video-list/     # Main browse page with video player overlay
      imprint/        # Imprint page
      privacy/        # Privacy policy page
    shared/
      components/     # Header, Footer, Toast notification
  styles/
    preview.scss      # Hero preview section styles
    video-overlay.scss# Video player overlay (top bar, info, fullscreen, Plyr overrides)
    video-list.scss   # Video grid, thumbnails, scroll indicators
    standard.scss     # Utility classes and global layout
    header-footer.scss# Header and footer styles
    auth.scss         # Authentication page styles
    fonts.scss        # Font imports
  environments/       # API URL and HLS config per environment
```

---

## Pages

| Route                    | Description                                   | Guard      |
| ------------------------ | --------------------------------------------- | ---------- |
| `/`                      | Landing page with login/register entry points | guestGuard |
| `/auth/login`            | Login form                                    | guestGuard |
| `/auth/register`         | Registration form                             | guestGuard |
| `/auth/activate`         | Account activation via email link             | —          |
| `/auth/forgot-password`  | Request a password reset email                | —          |
| `/auth/confirm-password` | Set a new password via email link             | —          |
| `/videos`                | Browse videos, preview carousel, HLS player   | authGuard  |
| `/privacy`               | Privacy policy                                | —          |
| `/imprint`               | Imprint                                       | —          |

---

## Authentication

Authentication uses **JWT tokens stored in HTTP-only cookies**, set by the backend. The frontend never handles tokens directly — it simply includes cookies in every request (`withCredentials: true`).

- `authGuard` — checks local auth state first (localStorage flag); verifies with the API if the flag is set
- `guestGuard` — redirects already-authenticated users to `/videos`
- Tokens are automatically refreshed every 20 minutes via `AuthService.startTokenRefreshInterval()`

---

## Video Playback

The video player on `/videos` combines two libraries:

- **HLS.js** — fetches and decodes the HLS stream from the backend, supports quality level switching
- **Plyr** — provides the player UI (controls, quality menu, fullscreen, PiP)

Videos play in the browser without any plugins. On mobile, the player requests fullscreen automatically when in landscape orientation.

---

## Build

```bash
ng build
```

Production artifacts are output to `dist/`. The `environment.prod.ts` configuration is used automatically.

---

## Backend

This frontend requires the Videoflix backend running at `http://localhost:8000`.
See the [backend README](../backend/README.md) for setup instructions.
