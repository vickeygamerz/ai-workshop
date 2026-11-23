# Events API

Flask API backed by Supabase. The API routes are documented by the root endpoint (`GET /`).

## Deploy on Render

1. Upload this folder to a Git repository, or use it as the repository root.
2. In Render, create a new **Blueprint** and select that repository. Render reads `render.yaml` to configure the web service.
3. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in the service's environment settings when prompted.
4. Deploy. Render installs `requirements.txt` and starts the app with Gunicorn.

The same settings can be entered manually when creating a Web Service:

- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn app:app --bind 0.0.0.0:$PORT`
- Environment variables: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`

Do not upload or commit `.env` or the local `venv` directory. Configure environment variables in Render instead.

## Run locally

Install dependencies with `pip install -r requirements.txt`, set the two Supabase environment variables (or put them in a local `.env` file), then run `python app.py`.
