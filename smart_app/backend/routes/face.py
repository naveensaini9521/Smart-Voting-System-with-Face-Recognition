from flask import Blueprint, request, jsonify
import base64, os

face_bp = Blueprint("face", __name__)
UPLOAD_FOLDER = "face_uploads/"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@face_bp.route("/register", methods=["POST"])
def register_face():
    data = request.json
    voter_id = data.get("voter_id")
    image_data = data.get("image")

    if not image_data or not voter_id:
        return jsonify({"message": "Missing voter_id or image"}), 400

    # Save face image
    img_bytes = base64.b64decode(image_data.split(",")[1])
    filename = f"{UPLOAD_FOLDER}/face_{voter_id}.png"
    with open(filename, "wb") as f:
        f.write(img_bytes)

    # In real system: run face recognition and mark verified
    return jsonify({"message": "Face registered", "verified": True})
