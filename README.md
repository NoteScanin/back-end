# NoteScanin Backend (minimal scaffold)

Quickstart:

Install dependencies:

```bash
cd backend
npm install
```

Run dev server:

```bash
npm run dev
```

Endpoints created: health, notes upload/list/detail/delete, ocr job start/status/result/stream, pdf generate/download.

Storage is served from `/storage` and uses a single backend directory so uploaded notes and generated PDFs are available consistently in local dev and Docker.

Responses now follow a consistent envelope: `success` plus `data` for success, and a string `error` plus `error_details` for failures. Existing top-level fields are still included for compatibility.
