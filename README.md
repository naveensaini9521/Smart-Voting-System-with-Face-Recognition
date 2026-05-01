# Smart Voting System

A full-stack web application for secure and efficient voting, featuring face recognition authentication.  
**Backend**: Flask (Python)  
**Frontend**: React + TypeScript + Vite

## Prerequisites

- Python 3.8+
- Node.js and npm
- pip (Python package manager)

---

## Create & activate virtual environment:

`````bash
python -m venv venv
```
### Windows
```bash
venv\Scripts\activate
```
### Linux
```bash
source venv/bin/activate
```
### Install required packages:
```bash
pip install -r requirements.txt
```
## 1️⃣ Backend Setup (Flask)

Open a terminal and navigate to the backend folder:

````bash
cd /Smart-Voting-System-with-Face-Recognition/smart_app
```
### Run the Flask server
```bash
python run.py
```
The backend will be available at http://localhost:5000

## 2️⃣ Frontend Setup (React + Vite + TypeScript)
```bash
cd /Smart-Voting-System-with-Face-Recognition/smart_app/frontend
```
Create Vite project (if not already done)
```bash
npm create vite@latest
```
Then install dependencies:
```bash
npm install
```
Install additional packages
```bash
npm install axios react-router-dom
```
```bash
npm install bootstrap react-bootstrap
# or
npm install tailwindcss
```
Run the frontend dev server
```bash
npm run dev
```
`````
