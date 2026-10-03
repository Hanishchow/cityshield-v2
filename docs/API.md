# City Shield API

Fastify 5 + Postgres/PostGIS (Drizzle). Live OpenAPI explorer: **`/docs`**.
All bodies are validated with the zod schemas in `shared/contract.ts`; errors are
`{ "error": string, "issues"?: [...] }`. Timestamps are epoch milliseconds.

## Ports

| Service | Port | Notes |
|---|---|---|
| Web (Vite dev) | 5178 | proxies `/v1`, `/health`, `/docs` to `API_ORIGIN` |
| Web (Vite preview) | 4178 | same proxy |
| API (in container) | 8787 | `PORT` |
| API on celure | `100.93.157.65:8788` | Tailscale only (`API_BIND`) |
| Postgres + PostGIS | 5432 | internal to the compose network, not published |

## Auth

`POST /v1/auth/device {deviceId}` → `{token, user}`: every device gets an anonymous
session first, so **SOS never waits on a sign-in**. Send `Authorization: Bearer <token>`.
Phone verification: `POST /v1/auth/otp/request {phone}` then `POST /v1/auth/otp/verify
{phone, code, deviceId}`. No SMS provider yet: in demo mode the code comes back as `devCode`.

## Endpoints (`/v1`)

| Area | Method & path | Notes |
|---|---|---|
| System | `GET /health` | store, demo flag, serverTime (clients sync their clock), capabilities |
| Account | `GET/PATCH /me` | name, phone, lang, theme, prefs, shareLive, area |
| | `GET/POST /places`, `PATCH/DELETE /places/:id` | saved places |
| | `GET /notifications?kind=`, `POST /notifications/read {ids}\|{all}` | |
| | `POST /feedback` | |
| Geo | `GET /geo/reverse?lat&lng`, `GET /geo/search?q` | Mappls → Ola → labelled stand-in |
| | `GET /nearby/hospitals?lat&lng`, `GET /nearby/stations?kind&lat&lng` | PostGIS KNN |
| | `GET /units/:id` | officer details |
| Emergency | `POST /sos {location}` + `Idempotency-Key` | ambulance + police; **not rate-limited** |
| | `POST /incidents {kind, location}` | police / ambulance / fire / civic |
| | `GET /incidents?active=1`, `GET /incidents/:id` | shared incident record |
| | `PATCH /incidents/:id {destinationHospitalId}` | |
| | `POST /incidents/:id/cancel\|close\|replay` | replay = demo only |
| | `POST /incidents/:id/location` | live pings (deleted after 30 days) |
| Complaints | `POST /uploads` (multipart `file`) | re-encoded JPEG, EXIF/GPS stripped, ≤5 MB |
| | `POST /complaints {category, location, title?, description?, photoId?}` | auto-routed agency |
| | `GET /complaints?status=all\|open\|resolved`, `GET /complaints/:id` | timeline + crew |
| Command Centre | `GET /ops/kpis\|incidents\|units\|wards` | open in demo mode, operator role otherwise |
| | `PATCH /ops/incidents/:id`, `PATCH /ops/complaints/:id` | resolve etc. |
| Live (SSE) | `GET /stream?token=`, `GET /ops/stream?token=` | `incident`, `complaint`, `notification`, `arrived` events |

Vehicle positions are not streamed: an assignment carries its route, `dispatchedAt` and
`durationMs`, and every client computes the position from the shared clock
(`shared/progress.ts`). The stream only announces state changes.

## Deploy (celure)

```powershell
pwsh deploy/deploy.ps1
```
Ships the committed HEAD to `/srv/celure/cityshield2`, builds `cityshield2-api`, runs
migrations and seeding on boot. Secrets live only in `/srv/celure/cityshield2/.env`.
The separate live stack in `/srv/celure/cityshield` (cityshield.live) is not touched.
