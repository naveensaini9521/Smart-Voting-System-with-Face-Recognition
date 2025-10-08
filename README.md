1️⃣ Setup Python & Flask Backend

Create a project folder (if not done yet):

-> mkdir SmartVotingSystem
-> cd SmartVotingSystem


Create a virtual environment:

-> python -m venv venv


Activate the virtual environment:

Windows:

-> venv\Scripts\activate


Linux/Mac:

-> source venv/bin/activate


Install Flask & other dependencies:

-> pip install Flask Flask-SQLAlchemy Flask-Migrate Flask-Cors face_recognition opencv-python numpy python-dotenv bcrypt
 


2️⃣ Setup React Frontend

Navigate to project folder:

-> cd SmartVotingSystem


Create React app (inside frontend folder):

-> npx create-react-app frontend


Navigate into frontend folder:

-> cd frontend


Install additional dependencies:

-> npm install axios react-router-dom


Explanation:

axios → For API calls to Flask backend

react-router-dom → For multi-page routing (login, dashboard, voting)

Optional UI libraries:

-> npm install bootstrap react-bootstrap
# or
-> npm install tailwindcss


3. Run Both Servers

Run Flask backend:

cd backend
export FLASK_APP=run.py    # Linux/Mac
set FLASK_APP=run.py       # Windows
flask run


Backend runs at: http://localhost:5000

Run React frontend:

cd frontend
npm start


Frontend runs at: http://localhost:3000