import cv2
import numpy as np
import base64
import io
from PIL import Image
import os
import logging
from typing import Tuple, Optional, List
import dlib
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

class FaceRecognitionService:
    def __init__(self):
        self.detector = dlib.get_frontal_face_detector()
        
        # Load shape predictor for facial landmarks
        shape_predictor_path = "shape_predictor_68_face_landmarks.dat"
        if os.path.exists(shape_predictor_path):
            self.predictor = dlib.shape_predictor(shape_predictor_path)
        else:
            logger.warning("Shape predictor file not found. Face landmark detection disabled.")
            self.predictor = None
        
        # Load face recognition model
        face_recognition_model_path = "dlib_face_recognition_resnet_model_v1.dat"
        if os.path.exists(face_recognition_model_path):
            self.face_recognizer = dlib.face_recognition_model_v1(face_recognition_model_path)
        else:
            logger.warning("Face recognition model not found. Using basic encoding.")
            self.face_recognizer = None
    
    def base64_to_image(self, image_data: str) -> np.ndarray:
        """Convert base64 image data to numpy array"""
        try:
            if ',' in image_data:
                image_data = image_data.split(',')[1]
            
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            return np.array(image)
        except Exception as e:
            logger.error(f"Error converting base64 to image: {str(e)}")
            raise ValueError("Invalid image data")
    
    def image_to_base64(self, image_array: np.ndarray) -> str:
        """Convert numpy array image to base64 string"""
        try:
            image = Image.fromarray(image_array)
            buffered = io.BytesIO()
            image.save(buffered, format="JPEG")
            img_str = base64.b64encode(buffered.getvalue()).decode()
            return f"data:image/jpeg;base64,{img_str}"
        except Exception as e:
            logger.error(f"Error converting image to base64: {str(e)}")
            raise
    
    def detect_faces(self, image_array: np.ndarray) -> List[Tuple]:
        """Detect faces in image using dlib"""
        try:
            # Convert to grayscale for better detection
            gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
            
            # Detect faces
            faces = self.detector(gray)
            
            face_data = []
            for face in faces:
                x, y, w, h = face.left(), face.top(), face.width(), face.height()
                face_data.append((x, y, w, h))
            
            return face_data
        except Exception as e:
            logger.error(f"Error detecting faces: {str(e)}")
            return []
    
    def extract_face_encoding(self, image_array: np.ndarray) -> Optional[List[float]]:
        """Extract face encoding using dlib"""
        try:
            gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
            faces = self.detector(gray)
            
            if len(faces) == 0:
                logger.warning("No faces detected in image")
                return None
            
            # Use the first face found
            face = faces[0]
            
            if self.predictor and self.face_recognizer:
                # Get facial landmarks
                shape = self.predictor(gray, face)
                
                # Get face encoding
                face_encoding = self.face_recognizer.compute_face_descriptor(image_array, shape)
                return list(face_encoding)
            else:
                # Fallback: Use OpenCV-based encoding
                return self._extract_basic_encoding(image_array, face)
                
        except Exception as e:
            logger.error(f"Error extracting face encoding: {str(e)}")
            return None
    
    def _extract_basic_encoding(self, image_array: np.ndarray, face) -> List[float]:
        """Extract basic face encoding using OpenCV (fallback method)"""
        try:
            # Extract face region
            x, y, w, h = face.left(), face.top(), face.width(), face.height()
            face_region = image_array[y:y+h, x:x+w]
            
            # Resize to standard size
            face_resized = cv2.resize(face_region, (128, 128))
            
            # Convert to grayscale and normalize
            face_gray = cv2.cvtColor(face_resized, cv2.COLOR_RGB2GRAY)
            face_normalized = face_gray / 255.0
            
            # Flatten and create a basic encoding (128 dimensions)
            encoding = face_normalized.flatten()
            
            # Pad or truncate to 128 dimensions
            if len(encoding) > 128:
                encoding = encoding[:128]
            elif len(encoding) < 128:
                encoding = np.pad(encoding, (0, 128 - len(encoding)))
            
            return encoding.tolist()
        except Exception as e:
            logger.error(f"Error in basic encoding extraction: {str(e)}")
            # Return random encoding as last resort
            return np.random.rand(128).tolist()
    
    def compare_faces(self, encoding1: List[float], encoding2: List[float], threshold: float = 0.6) -> Tuple[bool, float]:
        """Compare two face encodings and return match result and confidence"""
        try:
            # Convert to numpy arrays
            enc1 = np.array(encoding1).reshape(1, -1)
            enc2 = np.array(encoding2).reshape(1, -1)
            
            # Calculate cosine similarity
            similarity = cosine_similarity(enc1, enc2)[0][0]
            
            # Normalize similarity to 0-1 range
            confidence = (similarity + 1) / 2
            
            # Check if it's a match based on threshold
            is_match = confidence >= threshold
            
            return is_match, float(confidence)
            
        except Exception as e:
            logger.error(f"Error comparing faces: {str(e)}")
            return False, 0.0
    
    def preprocess_image(self, image_array: np.ndarray) -> np.ndarray:
        """Preprocess image for better face detection"""
        try:
            # Convert to RGB if needed
            if len(image_array.shape) == 2:  # Grayscale
                image_array = cv2.cvtColor(image_array, cv2.COLOR_GRAY2RGB)
            elif image_array.shape[2] == 4:  # RGBA
                image_array = cv2.cvtColor(image_array, cv2.COLOR_RGBA2RGB)
            
            # Enhance contrast using CLAHE
            lab = cv2.cvtColor(image_array, cv2.COLOR_RGB2LAB)
            lab_planes = list(cv2.split(lab))
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            lab_planes[0] = clahe.apply(lab_planes[0])
            lab = cv2.merge(lab_planes)
            image_array = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
            
            return image_array
        except Exception as e:
            logger.error(f"Error preprocessing image: {str(e)}")
            return image_array
    
    def validate_face_image(self, image_array: np.ndarray) -> Tuple[bool, str]:
        """Validate if image contains a clear, proper face"""
        try:
            # Check image size
            height, width = image_array.shape[:2]
            if height < 100 or width < 100:
                return False, "Image too small"
            
            # Detect faces
            faces = self.detect_faces(image_array)
            
            if len(faces) == 0:
                return False, "No face detected"
            
            if len(faces) > 1:
                return False, "Multiple faces detected"
            
            # Check face size and position
            x, y, w, h = faces[0]
            face_area = w * h
            image_area = width * height
            
            if face_area < 0.1 * image_area:  # Face too small
                return False, "Face too small in image"
            
            # Check if face is centered reasonably
            center_x, center_y = x + w/2, y + h/2
            image_center_x, image_center_y = width/2, height/2
            
            distance_from_center = np.sqrt((center_x - image_center_x)**2 + (center_y - image_center_y)**2)
            max_distance = min(width, height) * 0.3
            
            if distance_from_center > max_distance:
                return False, "Face not properly centered"
            
            return True, "Valid face image"
            
        except Exception as e:
            logger.error(f"Error validating face image: {str(e)}")
            return False, f"Validation error: {str(e)}"

# Global instance
face_service = FaceRecognitionService()