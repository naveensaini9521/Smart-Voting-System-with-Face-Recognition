# smart_app/backend/extensions.py
from flask_pymongo import PyMongo
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from flask_cors import CORS
from flask_bcrypt import Bcrypt

# MongoDB only - no SQLAlchemy
mongo = PyMongo()
jwt = JWTManager()
mail = Mail()
cors = CORS()
bcrypt = Bcrypt()