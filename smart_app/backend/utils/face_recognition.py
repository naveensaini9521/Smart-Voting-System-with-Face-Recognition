import face_recognition
import cv2
import numpy as np
import base64
import os
from datetime import datetime
import json

class FaceRecognitionSystem:
    def __init__(self, known_faces_dir='known_faces'):
        self.known_faces_dir = known_faces_dir
        os.makedirs(known_faces_dir, exist_ok=True)
    
    def base64_to_image(self, base64_string: str) -> np.ndarray:
        """Convert base64 string to OpenCV image"""
        try:
            # Remove data URL prefix if present
            if ',' in base64_string:
                base64_string = base64_string.split(',')[1]
            
            image_data = base64.b64decode(base64_string)
            np_array = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(np_array, cv2.IMREAD_COLOR)
            return image
        except Exception as e:
            raise Exception(f"Failed to decode base64 image: {str(e)}")
    
    def extract_face_encoding(self, image: np.ndarray) -> list:
        """Extract face encoding from image"""
        try:
            # Convert BGR to RGB
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Find face locations
            face_locations = face_recognition.face_locations(rgb_image)
            
            if not face_locations:
                raise Exception("No face detected in the image")
            
            if len(face_locations) > 1:
                raise Exception("Multiple faces detected. Please provide an image with only one face.")
            
            # Extract face encodings
            face_encodings = face_recognition.face_encodings(rgb_image, face_locations)
            
            if not face_encodings:
                raise Exception("Could not extract face features")
            
            return face_encodings[0].tolist()  # Convert numpy array to list for JSON serialization
            
        except Exception as e:
            raise Exception(f"Face encoding extraction failed: {str(e)}")
    
    def verify_face_match(self, stored_encoding: list, current_image: np.ndarray, tolerance: float = 0.6) -> dict:
        """Verify if face matches stored encoding"""
        try:
            current_encoding = self.extract_face_encoding(current_image)
            
            # Convert back to numpy arrays for comparison
            stored_encoding_np = np.array(stored_encoding)
            current_encoding_np = np.array(current_encoding)
            
            # Compare faces
            distance = face_recognition.face_distance([stored_encoding_np], current_encoding_np)[0]
            matches = distance <= tolerance
            
            return {
                'match': bool(matches),
                'confidence': float(1 - distance),
                'distance': float(distance)
            }
            
        except Exception as e:
            raise Exception(f"Face verification failed: {str(e)}")
    
    def save_face_image(self, image: np.ndarray, voter_id: str) -> str:
        """Save face image to disk"""
        filename = f"{voter_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
        filepath = os.path.join(self.known_faces_dir, filename)
        cv2.imwrite(filepath, image)
        return filepath

# Global instance
face_system = FaceRecognitionSystem()