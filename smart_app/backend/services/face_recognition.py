import face_recognition
import numpy as np
import cv2
from PIL import Image
import io
import os
from typing import List, Tuple, Optional

class FaceRecognitionService:
    def __init__(self, tolerance: float = 0.6):
        self.tolerance = tolerance
    
    def extract_face_encoding(self, image_data: bytes) -> Optional[List[float]]:
        """
        Extract face encoding from image data
        """
        try:
            # Load image from bytes
            image = face_recognition.load_image_file(io.BytesIO(image_data))
            
            # Detect face encodings
            face_encodings = face_recognition.face_encodings(image)
            
            if len(face_encodings) == 0:
                raise ValueError("No face detected in the image")
            
            if len(face_encodings) > 1:
                raise ValueError("Multiple faces detected. Please provide an image with only one face.")
            
            return face_encodings[0].tolist()
            
        except Exception as e:
            raise Exception(f"Error extracting face encoding: {str(e)}")
    
    def verify_face(self, live_encoding: List[float], stored_encoding: List[float]) -> dict:
        """
        Verify if two face encodings match
        """
        try:
            # Convert to numpy arrays
            live_encoding_np = np.array(live_encoding)
            stored_encoding_np = np.array(stored_encoding)
            
            # Calculate face distance
            face_distance = face_recognition.face_distance([stored_encoding_np], live_encoding_np)[0]
            
            # Check if faces match
            is_match = face_distance < self.tolerance
            
            return {
                'is_match': bool(is_match),
                'distance': float(face_distance),
                'confidence': float((1 - face_distance) * 100),
                'threshold': self.tolerance
            }
            
        except Exception as e:
            raise Exception(f"Error verifying face: {str(e)}")
    
    def detect_multiple_faces(self, image_data: bytes) -> int:
        """
        Detect number of faces in an image
        """
        try:
            image = face_recognition.load_image_file(io.BytesIO(image_data))
            face_locations = face_recognition.face_locations(image)
            return len(face_locations)
            
        except Exception as e:
            raise Exception(f"Error detecting faces: {str(e)}")
    
    def validate_face_image(self, image_data: bytes) -> dict:
        """
        Validate face image for quality and requirements
        """
        try:
            # Check for multiple faces
            face_count = self.detect_multiple_faces(image_data)
            
            if face_count == 0:
                return {
                    'is_valid': False,
                    'error': 'No face detected in the image'
                }
            
            if face_count > 1:
                return {
                    'is_valid': False,
                    'error': 'Multiple faces detected. Please provide an image with only one face.'
                }
            
            # Try to extract encoding to verify quality
            encoding = self.extract_face_encoding(image_data)
            
            return {
                'is_valid': True,
                'face_count': face_count,
                'message': 'Face image is valid'
            }
            
        except Exception as e:
            return {
                'is_valid': False,
                'error': str(e)
            }

# Create global instance
face_service = FaceRecognitionService()