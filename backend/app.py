import os

from dotenv import load_dotenv
from flask import Flask, jsonify, make_response, request
from postgrest import APIError
from supabase import Client, create_client


load_dotenv()

app = Flask(__name__)

supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_PUBLISHABLE_KEY")
supabase: Client | None = None
if supabase_url and supabase_key:
    supabase = create_client(supabase_url, supabase_key)


@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        return make_response("", 204)


@app.after_request
def allow_cross_origin(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Accept"
    return response


def database():
    if supabase is None:
        return None, (jsonify(error="Supabase is not configured"), 503)
    return supabase, None


def db_error(error: APIError):
    # PostgREST errors carry useful status codes for missing rows and conflicts.
    status = getattr(error, "code", None)
    status_code = int(status) if str(status).isdigit() else 500
    if status_code < 400 or status_code > 599:
        status_code = 500
    return jsonify(error=getattr(error, "message", str(error))), status_code


@app.get("/")
def index():
    return jsonify(message="Events API", endpoints=[
        "GET /api/events",
        "GET /api/events/<id>",
        "POST /api/registrations",
        "GET /api/me/registrations?user_id=<uuid>",
        "GET /api/events/<id>/registrations",
    ])


@app.get("/api/events")
def list_events():
    client, error = database()
    if error:
        return error
    try:
        result = client.table("events").select("*").execute()
        return jsonify(result.data)
    except APIError as exc:
        return db_error(exc)


@app.get("/api/events/<event_id>")
def get_event(event_id):
    client, error = database()
    if error:
        return error
    try:
        result = client.table("events").select("*").eq("id", event_id).maybe_single().execute()
        if not result.data:
            return jsonify(error="Event not found"), 404
        return jsonify(result.data)
    except APIError as exc:
        return db_error(exc)


@app.post("/api/registrations")
def create_registration():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify(error="Request body must be a JSON object"), 400
    user_id = payload.get("user_id")
    event_id = payload.get("event_id")
    if not user_id or not event_id:
        return jsonify(error="user_id and event_id are required"), 400

    client, error = database()
    if error:
        return error
    try:
        event_result = client.table("events").select("id,capacity,status").eq("id", event_id).maybe_single().execute()
        event = event_result.data
        if not event:
            return jsonify(error="Event not found"), 404

        existing = (client.table("registrations").select("id")
                    .eq("user_id", user_id).eq("event_id", event_id).limit(1).execute())
        if existing.data:
            return jsonify(error="User is already registered for this event"), 409

        registrations = client.table("registrations").select("id").eq("event_id", event_id).execute()
        if event.get("capacity") is not None and len(registrations.data) >= event["capacity"]:
            return jsonify(error="Event is at capacity"), 409

        created = client.table("registrations").insert({
            "user_id": user_id,
            "event_id": event_id,
        }).execute()
        return jsonify(created.data[0]), 201
    except APIError as exc:
        return db_error(exc)


@app.get("/api/me/registrations")
def my_registrations():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify(error="user_id query parameter is required"), 400
    client, error = database()
    if error:
        return error
    try:
        result = (client.table("registrations")
                  .select("id,user_id,event_id,created_at,events(id,title,capacity,status)")
                  .eq("user_id", user_id).execute())
        return jsonify(result.data)
    except APIError as exc:
        return db_error(exc)


@app.get("/api/events/<event_id>/registrations")
def event_registrations(event_id):
    client, error = database()
    if error:
        return error
    try:
        event_result = client.table("events").select("id").eq("id", event_id).maybe_single().execute()
        if not event_result.data:
            return jsonify(error="Event not found"), 404
        result = (client.table("registrations")
                  .select("id,user_id,event_id,created_at,users(id,email,role)")
                  .eq("event_id", event_id).execute())
        return jsonify(result.data)
    except APIError as exc:
        return db_error(exc)


if __name__ == "__main__":
    app.run(debug=True)
