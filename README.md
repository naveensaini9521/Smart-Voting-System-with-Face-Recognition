# Smart Voting System

A full-stack web application for secure and efficient voting, featuring face recognition authentication.  
**Backend**: Flask (Python)  
**Frontend**: React + TypeScript + Vite

## ✨ Features

- Face recognition-based authentication
- Secure voting system
- Admin dashboard
- Real-time vote counting

## Prerequisites

- Python 3.8+
- Node.js and npm
- pip (Python package manager)

## 🛠 Tech Stack

- Python
- Flask
- React
- Socket-io
- OpenCV
- MongoDB
- HTML, CSS, JavaScript

---

## 📁 Project Structure

Smart-Voting-System-with-Face-Recognition/
│── data/ # Dataset used for training/testing
│── instance/ # Instance-specific configs (Flask)
│── known_faces/ # Stored face encodings
│── migrations/ # Database migration files
│── public/ # Public assets
│── scripts/ # Utility scripts
│
│── smart_app/ # Main application
│ │── backend/ # Flask backend logic (routes, models, APIs)
│ │── frontend/ # React + Vite frontend
│ │── **init**.py # App initialization
│ │── gunicorn.conf.py # Deployment config
│
│── tests/ # Unit & integration tests
│── uploads/ # Uploaded images/videos
│── venv/ # Virtual environment (ignored in Git)
│
│── .env # Environment variables
│── config.py # App configuration
│── create_admin.py # Script to create admin user
│── libstdc++.so.6 # Dependency file
│── mongo_setup.py # MongoDB setup script
│── requirements.txt # Python dependencies
│── run.py # Entry point for Flask app
│── README.md # Project documentation

## 🚀 Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/naveensaini9521/Smart-Voting-System-with-Face-Recognition.git
```

### 2. Navigate to project

```bash
cd Smart-Voting-System-with-Face-Recognition
```

### 3. Create virtual environment

```bash
python -m venv venv
```

### 4. Activate environment

#### Windows

```bash
venv\Scripts\activate
```

#### Linux/Mac

```bash
source venv/bin/activate
```

### 5. Install dependencies

```bash
pip install -r requirements.txt
```

### 6. Run the app

```bash
python run.py
```

## 1️⃣ Backend Setup (Flask)

Open a terminal and navigate to the backend folder:

```bash
cd /Smart-Voting-System-with-Face-Recognition/smart_app/backend
```

The backend will be available at http://localhost:5000

## 2️⃣ Frontend Setup (React + Vite + TypeScript)

```bash
cd /Smart-Voting-System-with-Face-Recognition/smart_app/frontend
```

### Create Vite project (if not already done)

```bash
npm create vite@latest
```

### Then install dependencies:

```bash
npm install
```

### Install additional packages

````bash
npm install axios react-router-dom
```bash
npm install bootstrap react-bootstrap
# or
npm install tailwindcss
````

### Run the frontend dev server

```bash
npm run dev
```

## 📌 Usage

- Register as a voter
- Login using face recognition
- Cast your vote securely

## 📸 Screenshots

## 🔮 Future Enhancements

- Add blockchain security
- Mobile app version
- Multi-language support

## 📄 License

This project is for educational purposes.
