from flask import Blueprint, request, jsonify
from database import db
from models import Voter
import bcrypt

register_bp = Blueprint("register", __name__)

@register_bp.route("/register", methods=["POST"])
def register_voter():
    data = request.json

    # Check if voter already exists
    if Voter.query.filter_by(email=data["email"]).first():
        return jsonify({"message": "Email already registered"}), 400

    # Hash password
    hashed_pw = bcrypt.hashpw(data["password"].encode("utf-8"), bcrypt.gensalt())

    new_voter = Voter(
        full_name=data["full_name"],
        father_name=data.get("father_name"),
        mother_name=data.get("mother_name"),
        gender=data.get("gender"),
        date_of_birth=data.get("date_of_birth"),
        place_of_birth=data.get("place_of_birth"),
        email=data["email"],
        phone=data["phone"],
        address_line1=data.get("address_line1"),
        address_line2=data.get("address_line2"),
        pincode=data.get("pincode"),
        village_city=data.get("village_city"),
        district=data.get("district"),
        state=data.get("state"),
        country=data.get("country"),
        national_id_type=data.get("national_id_type"),
        national_id_number=data.get("national_id_number"),
        password=hashed_pw,
        security_question=data.get("security_question"),
        security_answer=data.get("security_answer")
    )

    db.session.add(new_voter)
    db.session.commit()

    return jsonify({"message": "Registration successful", "voter_id": new_voter.id})
