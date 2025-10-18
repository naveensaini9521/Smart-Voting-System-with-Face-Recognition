import os
from smart_app.backend.app import create_app

app = create_app()

if __name__ == '__main__':
    # Check if React build exists
    react_build_path = os.path.join(os.path.dirname(__file__), 'frontend', 'dist')
    if not os.path.exists(react_build_path):
        print("Warning: React build not found. Please run 'npm run build' in the frontend directory.")
        print("The app will run but the frontend may not work properly.")
    
    app.run(host='127.0.0.1', port=5000, debug=True)