# Videoflix Frontend

🌐 Sprache: [English](README.md) | Deutsch

Eine Angular 19 Single-Page-Applikation für die Videoflix-Videostreamingplattform.
Nutzer können nach dem Einloggen Videos durchsuchen, in der Vorschau ansehen und in adaptiver Qualität (HLS) streamen.

Dieses Projekt wurde im Rahmen des Developer Akademie Lehrplans entwickelt.

---

## Tech Stack

| Technologie | Version | Zweck                                          |
| ----------- | ------- | ---------------------------------------------- |
| Angular     | 19.2    | SPA-Framework (Standalone Components, Signals) |
| TypeScript  | 5.7     | Programmiersprache                             |
| SCSS        | —       | Styling                                        |
| hls.js      | 1.6.16  | Adaptives HLS-Streaming                        |
| Plyr        | 3.8.4   | Video-Player-Oberfläche                        |
| RxJS        | 7.8     | Reaktiver State & HTTP                         |

---

## Voraussetzungen

- **Node.js** >= 18
- **Angular CLI** >= 19 (`npm install -g @angular/cli`)

---

## Quick Start

**Schritt 1 – Abhängigkeiten installieren:**

```bash
npm install
```

**Schritt 2 – Entwicklungsserver starten:**

```bash
ng serve
```

Die App ist dann erreichbar unter `http://localhost:4200/`. Änderungen werden automatisch neu geladen.

> Stelle sicher, dass das [Backend](../backend/) läuft, bevor du das Frontend startest.

---

## Konfiguration

API-URL und HLS-Parameter werden in `src/environments/environment.ts` (Entwicklung) und `src/environments/environment.prod.ts` (Produktion) konfiguriert.

| Schlüssel       | Standardwert                 | Beschreibung                                   |
| --------------- | ---------------------------- | ---------------------------------------------- |
| `apiBaseUrl`    | `http://localhost:8000/api/` | Basis-URL der Backend-REST-API                 |
| `toastDuration` | `2000`                       | Anzeigedauer von Toast-Benachrichtigungen (ms) |
| `hls.*`         | verschiedene                 | HLS.js-Player-Tuning-Optionen                  |

---

## Projektstruktur

```
src/
  app/
    core/
      guards/         # authGuard (geschützte Routen), guestGuard (nur öffentliche Routen)
      services/       # ApiService, AuthService, VideoService, ToastService
    features/
      home/           # Startseite
      auth/           # Login, Register, Aktivierung, Passwort vergessen, Passwort zurücksetzen
      video-list/     # Hauptseite mit Video-Vorschau und Player-Overlay
      imprint/        # Impressum
      privacy/        # Datenschutzerklärung
    shared/
      components/     # Header, Footer, Toast-Benachrichtigung
  styles/
    preview.scss      # Stile für den Hero-Vorschaubereich
    video-overlay.scss# Video-Player-Overlay (Top-Bar, Info, Vollbild, Plyr-Overrides)
    video-list.scss   # Video-Grid, Thumbnails, Scroll-Indikatoren
    standard.scss     # Utility-Klassen und globales Layout
    header-footer.scss# Header- und Footer-Stile
    auth.scss         # Stile für Authentifizierungsseiten
    fonts.scss        # Schriftarten-Importe
  environments/       # API-URL und HLS-Konfiguration je Umgebung
```

---

## Seiten

| Route                    | Beschreibung                                         | Guard      |
| ------------------------ | ---------------------------------------------------- | ---------- |
| `/`                      | Startseite mit Login/Registrierungs-Einstiegspunkten | guestGuard |
| `/auth/login`            | Login-Formular                                       | guestGuard |
| `/auth/register`         | Registrierungsformular                               | guestGuard |
| `/auth/activate`         | Kontoaktivierung über E-Mail-Link                    | —          |
| `/auth/forgot-password`  | Passwort-Reset-E-Mail anfordern                      | —          |
| `/auth/confirm-password` | Neues Passwort über E-Mail-Link setzen               | —          |
| `/videos`                | Videos durchsuchen, Vorschau-Karussell, HLS-Player   | authGuard  |
| `/privacy`               | Datenschutzerklärung                                 | —          |
| `/imprint`               | Impressum                                            | —          |

---

## Authentifizierung

Die Authentifizierung nutzt **JWT-Tokens in HTTP-only Cookies**, die vom Backend gesetzt werden. Das Frontend verwaltet Tokens nie direkt — es übergibt die Cookies mit jeder Anfrage (`withCredentials: true`).

- `authGuard` — prüft zuerst den lokalen Auth-Status (localStorage-Flag); verifiziert bei der API wenn das Flag gesetzt ist
- `guestGuard` — leitet bereits eingeloggte Nutzer zu `/videos` weiter
- Tokens werden automatisch alle 20 Minuten via `AuthService.startTokenRefreshInterval()` erneuert

---

## Videowiedergabe

Der Video-Player auf `/videos` kombiniert zwei Bibliotheken:

- **HLS.js** — lädt und dekodiert den HLS-Stream vom Backend, unterstützt Qualitätsstufenwechsel
- **Plyr** — stellt die Player-Oberfläche bereit (Steuerelemente, Qualitätsmenü, Vollbild, PiP)

Videos werden im Browser ohne Plugins abgespielt. Auf Mobilgeräten wechselt der Player automatisch in den Vollbildmodus, wenn das Gerät im Querformat ist.

---

## Build

```bash
ng build
```

Produktions-Artefakte werden in `dist/` ausgegeben. Die `environment.prod.ts`-Konfiguration wird automatisch verwendet.

---

## Backend

Dieses Frontend benötigt das Videoflix-Backend unter `http://localhost:8000`.
Weitere Informationen zur Einrichtung findest du im [Backend-Repository](https://github.com/Danielluzius/videoflix-backend).
