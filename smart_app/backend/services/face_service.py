import cv2
import numpy as np
import base64
import io
from PIL import Image
import os
import logging
from typing import Optional, Tuple, List
import json

logger = logging.getLogger(__name__)

class FaceService:
    def __init__(self):
        self.face_cascade = None
        self.recognizer = None
        self.trained_faces = {}
        self.initialize_face_detection()
    
    def initialize_face_detection(self):
        """Initialize face detection with OpenCV"""
        try:
            # Load OpenCV face detector
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            self.face_cascade = cv2.CascadeClassifier(cascade_path)
            
            if self.face_cascade.empty():
                logger.error("Failed to load face cascade classifier")
                return False
            
            # Initialize face recognizer
            self.recognizer = cv2.face.LBPHFaceRecognizer_create()
            
            logger.info("Face service initialized successfully with OpenCV")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize face detection: {str(e)}")
            self.face_cascade = None
            self.recognizer = None
            return False
    
    def base64_to_image(self, image_data: str) -> Optional[np.ndarray]:
        """Convert base64 image data to OpenCV image"""
        try:
            if ',' in image_data:
                image_data = image_data.split(',')[1]
            
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
            
            # Convert PIL image to OpenCV format (BGR)
            image_np = np.array(image)
            
            if len(image_np.shape) == 3:
                if image_np.shape[2] == 4:  # RGBA
                    image_np = cv2.cvtColor(image_np, cv2.COLOR_RGBA2BGR)
                else:  # RGB
                    image_np = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
            
            return image_np
            
        except Exception as e:
            logger.error(f"Error converting base64 to image: {str(e)}")
            return None
    
    def detect_faces(self, image_array: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """Detect faces in image using OpenCV"""
        if self.face_cascade is None:
            raise RuntimeError("Face detector not initialized")
        
        try:
            # Convert to grayscale for face detection
            if len(image_array.shape) == 3:
                gray = cv2.cvtColor(image_array, cv2.COLOR_BGR2GRAY)
            else:
                gray = image_array
            
            # Detect faces
            faces = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(100, 100),  # Minimum face size
                flags=cv2.CASCADE_SCALE_IMAGE
            )
            
            return [(int(x), int(y), int(w), int(h)) for (x, y, w, h) in faces]
            
        except Exception as e:
            logger.error(f"Error detecting faces: {str(e)}")
            return []
    
    def extract_face_features(self, image_array: np.ndarray) -> Optional[dict]:
        """
        Extract face features and create a unique signature
        """
        try:
            faces = self.detect_faces(image_array)
            
            if not faces:
                return None
            
            # Use the largest face
            largest_face = max(faces, key=lambda rect: rect[2] * rect[3])
            x, y, w, h = largest_face
            
            # Extract face region
            if len(image_array.shape) == 3:
                gray = cv2.cvtColor(image_array, cv2.COLOR_BGR2GRAY)
            else:
                gray = image_array
            
            face_region = gray[y:y+h, x:x+w]
            
            # Resize to standard size for consistent feature extraction
            face_resized = cv2.resize(face_region, (200, 200))
            
            # Apply histogram equalization for better contrast
            face_equalized = cv2.equalizeHist(face_resized)
            
            # Extract multiple feature types
            features = {
                'histogram': self.extract_histogram_features(face_equalized),
                'lbp_features': self.extract_lbp_features(face_equalized),
                'face_region': [x, y, w, h],
                'image_shape': image_array.shape
            }
            
            return features
            
        except Exception as e:
            logger.error(f"Error extracting face features: {str(e)}")
            return None
    
    def extract_histogram_features(self, face_image: np.ndarray) -> List[float]:
        """Extract histogram-based features"""
        hist = cv2.calcHist([face_image], [0], None, [64], [0, 256])
        cv2.normalize(hist, hist)
        return hist.flatten().tolist()
    
    def extract_lbp_features(self, face_image: np.ndarray) -> List[float]:
        """Extract Local Binary Pattern features (simplified)"""
        # Simple gradient-based features as LBP alternative
        sobelx = cv2.Sobel(face_image, cv2.CV_64F, 1, 0, ksize=3)
        sobely = cv2.Sobel(face_image, cv2.CV_64F, 0, 1, ksize=3)
        
        magnitude = np.sqrt(sobelx**2 + sobely**2)
        features = cv2.normalize(magnitude, None, 0, 1, cv2.NORM_MINMAX)
        
        return features.flatten().tolist()[:100]  # Take first 100 features
    
    def compare_faces(self, features1: dict, features2: dict, threshold: float = 0.7) -> Tuple[bool, float]:
        """
        Compare two face feature sets using multiple methods
        """
        try:
            if not features1 or not features2:
                return False, 0.0
            
            similarities = []
            
            # Compare histogram features
            hist1 = np.array(features1.get('histogram', []))
            hist2 = np.array(features2.get('histogram', []))
            
            if len(hist1) > 0 and len(hist2) > 0:
                min_len = min(len(hist1), len(hist2))
                hist_sim = cv2.compareHist(
                    hist1[:min_len].astype(np.float32), 
                    hist2[:min_len].astype(np.float32), 
                    cv2.HISTCMP_CORREL
                )
                similarities.append(max(0, hist_sim))  # Ensure non-negative
            
            # Compare LBP features
            lbp1 = np.array(features1.get('lbp_features', []))
            lbp2 = np.array(features2.get('lbp_features', []))
            
            if len(lbp1) > 0 and len(lbp2) > 0:
                min_len = min(len(lbp1), len(lbp2))
                lbp_sim = 1 - np.linalg.norm(lbp1[:min_len] - lbp2[:min_len]) / min_len
                similarities.append(max(0, lbp_sim))
            
            if not similarities:
                return False, 0.0
            
            # Weighted average of similarities
            overall_similarity = np.mean(similarities)
            match = overall_similarity >= threshold
            
            return match, overall_similarity
            
        except Exception as e:
            logger.error(f"Error comparing faces: {str(e)}")
            return False, 0.0
    
    def validate_face_image(self, image_array: np.ndarray) -> dict:
        """
        Validate if image contains a proper face for registration
        """
        try:
            faces = self.detect_faces(image_array)
            
            if not faces:
                return {
                    'valid': False,
                    'message': 'No face detected in the image. Please ensure your face is clearly visible.',
                    'code': 'NO_FACE'
                }
            
            if len(faces) > 1:
                return {
                    'valid': False,
                    'message': 'Multiple faces detected. Please provide an image with only one face.',
                    'code': 'MULTIPLE_FACES'
                }
            
            x, y, w, h = faces[0]
            
            # Check face size and position
            img_height, img_width = image_array.shape[:2]
            face_area = w * h
            image_area = img_width * img_height
            
            # Face should be reasonably large and centered
            if face_area < image_area * 0.1:  # Less than 10% of image
                return {
                    'valid': False,
                    'message': 'Face is too small. Please move closer to the camera.',
                    'code': 'FACE_TOO_SMALL'
                }
            
            if face_area > image_area * 0.8:  # More than 80% of image
                return {
                    'valid': False,
                    'message': 'Face is too large. Please move slightly away from the camera.',
                    'code': 'FACE_TOO_LARGE'
                }
            
            # Check if face is reasonably centered
            center_x, center_y = x + w//2, y + h//2
            img_center_x, img_center_y = img_width//2, img_height//2
            
            distance_from_center = np.sqrt(
                (center_x - img_center_x)**2 + (center_y - img_center_y)**2
            )
            
            max_distance = min(img_width, img_height) * 0.3
            
            if distance_from_center > max_distance:
                return {
                    'valid': False,
                    'message': 'Please position your face in the center of the frame.',
                    'code': 'FACE_NOT_CENTERED'
                }
            
            return {
                'valid': True,
                'message': 'Face validation successful',
                'code': 'SUCCESS',
                'face_count': len(faces),
                'face_region': faces[0],
                'image_dimensions': (img_width, img_height)
            }
            
        except Exception as e:
            return {
                'valid': False,
                'message': f'Face validation failed: {str(e)}',
                'code': 'VALIDATION_ERROR'
            }
    
    def check_duplicate_face(self, new_features: dict, existing_voters: list) -> Tuple[bool, float, str]:
        """
        Check if face already exists in the database
        """
        try:
            max_similarity = 0.0
            duplicate_voter_id = None
            
            for voter in existing_voters:
                if voter.face_encoding_path:
                    try:
                        stored_face = voter.get_face_encoding_mongo()
                        if stored_face and 'features' in stored_face:
                            stored_features = stored_face['features']
                            
                            match, similarity = self.compare_faces(
                                new_features, stored_features, threshold=0.6
                            )
                            
                            if similarity > max_similarity:
                                max_similarity = similarity
                                if match and similarity > 0.7:
                                    duplicate_voter_id = voter.voter_id
                    
                    except Exception as e:
                        logger.error(f"Error checking voter {voter.voter_id}: {str(e)}")
                        continue
            
            duplicate_found = duplicate_voter_id is not None and max_similarity > 0.7
            
            return duplicate_found, max_similarity, duplicate_voter_id
            
        except Exception as e:
            logger.error(f"Error in duplicate face check: {str(e)}")
            return False, 0.0, None

# Global instance
face_service = FaceService()