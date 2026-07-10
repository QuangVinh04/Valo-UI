# Valo UI

Valo UI is the React frontend for Agent Hub, an enterprise-style AI workspace with chat, user management, group permissions, account settings, and OTP-verified registration flows.

## Tech Stack

- React 18
- TypeScript
- Vite
- React Router
- i18next / react-i18next
- lucide-react

## Features

- Secure login and registration flow
- OTP account verification screen
- AI chat interface with SSE streaming responses
- Conversation recents with rename/delete actions
- File upload support for chat context
- User and group management with permission-based UI gates
- Settings for profile, password, language, theme, storage, and account actions
- Centralized API request handling with token refresh support
- Toast-based system notifications

## Prerequisites

- Node.js 18 or newer
- npm
- Running Valo backend API

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Update `.env` as needed:

```bash
VITE_API_BASE_URL=http://localhost:4001/api/v1
VITE_UPLOAD_BASE_ENDPOINT=/attachments/uploads
VITE_UPLOAD_CHUNK_SIZE_BYTES=2097152
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Yes | Base URL for the backend API. |
| `VITE_UPLOAD_BASE_ENDPOINT` | No | Base API path for chunked multipart/form-data uploads. The frontend calls init/chunk/status/complete/cancel under this path. |
| `VITE_UPLOAD_CHUNK_SIZE_BYTES` | No | Chunk size in bytes for upload requests. Defaults to 2 MB. |

## Project Structure

```text
src/
  components/      Shared UI components
  context/         Auth, preferences, and toast providers
  features/        Feature modules such as chat, admin, and settings
  layouts/         App and auth layout components
  lib/             API/auth/error helpers
  pages/           Route-level pages
  routes/          Application route definitions
  services/        API service wrappers
  styles/          Global, layout, and page styles
```

## Backend Integration

The app expects the backend API to expose endpoints for:

- Authentication and token refresh
- Current user permissions
- User and group management
- Conversations and streamed messages
- Attachments and chat file workflows

The chat feature streams assistant responses through a `fetch()` `ReadableStream` and handles SSE-style events such as `ready`, `token`, `done`, and `error`.

## Notes for GitHub Publishing

- Do not commit `.env`.
- Keep `.env.example` updated when environment variables change.
- Do not commit `node_modules`, `dist`, or `*.tsbuildinfo`.
- Run `npm run build` before opening a pull request.
