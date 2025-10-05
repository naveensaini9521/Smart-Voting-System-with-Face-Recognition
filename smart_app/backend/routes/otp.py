from flask import Blueprint, request, jsonify
import random

otp_bp = Blueprint("otp", __name__)
otp_store = {}   # in-memory store, replace with Redis for production

@otp_bp.route("/send", methods=["POST"])
def send_otp():
    data = request.json
    otp_type = data.get("type")  # "email" or "phone"
    value = data.get("value")

    otp = str(random.randint(100000, 999999))
    otp_store[value] = otp

    print(f"OTP for {otp_type} {value}: {otp}")  # simulate sending
    return jsonify({"message": f"OTP sent to {otp_type}", "otp": otp})  # remove otp in prod

@otp_bp.route("/verify", methods=["POST"])
def verify_otp():
    data = request.json
    value = data.get("value")
    otp = data.get("otp")

    if otp_store.get(value) == otp:
        return jsonify({"message": "OTP verified"}), 200
    return jsonify({"message": "Invalid OTP"}), 400
