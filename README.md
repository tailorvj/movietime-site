# Gett Movie Time

Private screening access for the film _Gett_. Hebrew and Russian UI.

## Development

Requires Node 24+ and the [Netlify CLI](https://docs.netlify.com/cli/get-started/).

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:8888 (default `netlify dev` port).

## Build

```bash
npm run build
```

## Environment

Set these in the Netlify UI for production (and in `.env` for local dev):

| Variable                | Purpose                                                         |
| ----------------------- | --------------------------------------------------------------- |
| `APP_URL`               | Public site URL (no trailing slash)                             |
| `COOKIE_SECRET`         | Session cookie signing (required in production)                 |
| `EMAIL_HASH_SALT`       | Salt for hashed email storage (required in production)          |
| `RESEND_API_KEY`        | Transactional email (optional locally — access URLs are logged) |
| `EMAIL_FROM`            | Sender address for Resend                                       |
| `PUBLIC_VIMEO_VIDEO_ID` | Vimeo video id on the watch page                                |
| `PUBLIC_CONTACT_EMAIL`  | Contact address on the geo-unavailable page                     |

## Deployment

Hosted on **Netlify** from the `main` branch. The build command is `npm run build`; publish directory is `dist`. Serverless API routes live under `netlify/functions`; edge routing under `netlify/edge-functions`.

Netlify runs `npm install` (or `npm ci`) on deploy — you do not need Node installed locally to push source changes, as long as `package-lock.json` is committed.
