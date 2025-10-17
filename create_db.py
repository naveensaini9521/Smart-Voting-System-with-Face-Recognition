from smart_app.backend.app import app, db
from smart_app.backend.models import *

with app.app_context():
    db.create_all()
    print("All tables created successfully!")
