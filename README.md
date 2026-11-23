# Workshop Events API

A Flask API for events and registrations, backed by Supabase.

## Run locally

From the `backend` directory, install dependencies and configure `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in your environment or a local `.env` file:

```powershell
pip install -r requirements.txt
python app.py
```

The API routes are listed at `GET /`.

## Deploy on Render

Create a Render Blueprint from this repository and configure `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` as service environment variables. Render uses `backend/render.yaml` for the service configuration.

Keep `.env` local; do not commit credentials.
