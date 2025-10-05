import os
from flask import Blueprint, send_from_directory

# Absolute path to React build folder
frontend_path = os.path.abspath(os.path.join(os.getcwd(), "frontend/dist"))

frontend_bp = Blueprint(
    "frontend",
    __name__,
    static_folder=frontend_path,
    static_url_path=''  # serve everything from root
)

@frontend_bp.route("/", defaults={"path": ""})
@frontend_bp.route("/<path:path>")
def serve_react(path):
    full_path = os.path.join(frontend_path, path)
    if path != "" and os.path.exists(full_path):
        return send_from_directory(frontend_path, path)
    else:
        return send_from_directory(frontend_path, "index.html")
