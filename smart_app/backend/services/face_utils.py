# smart_app/backend/services/face_utils.py
import cv2
import numpy as np
import logging
from typing import List, Tuple, Optional, Dict
import mediapipe as mp

logger = logging.getLogger(__name__)

class FaceUtils:
    """Utility functions for face processing"""
    
    def __init__(self):
        try:
            import mediapipe as mp
            self.mp_drawing = mp.solutions.drawing_utils
            self.mp_drawing_styles = mp.solutions.drawing_styles
            self.MEDIAPIPE_AVAILABLE = True
        except ImportError:
            self.MEDIAPIPE_AVAILABLE = False
    
    def draw_face_annotations(self, image_array: np.ndarray, faces: List[Dict]) -> np.ndarray:
        """Draw annotations on detected faces"""
        try:
            annotated_image = image_array.copy()
            
            for face in faces:
                method = face.get('method', 'unknown')
                bbox = face.get('bbox')
                confidence = face.get('confidence', 0.0)
                
                if bbox:
                    x, y, w, h = bbox
                    
                    # Draw rectangle
                    color = self._get_color_for_method(method)
                    cv2.rectangle(annotated_image, (x, y), (x + w, y + h), color, 2)
                    
                    # Draw label
                    label = f"{method}: {confidence:.2f}"
                    cv2.putText(annotated_image, label, (x, y - 10),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
            
            return annotated_image
        except Exception as e:
            logger.error(f"Annotation drawing error: {str(e)}")
            return image_array
    
    def _get_color_for_method(self, method: str) -> Tuple[int, int, int]:
        """Get color for different detection methods"""
        colors = {
            'mediapipe': (0, 255, 0),      # Green
            'opencv': (255, 0, 0),         # Blue
            'dlib': (0, 0, 255),           # Red
            'face_recognition': (255, 255, 0),  # Cyan
            'ensemble': (255, 0, 255),     # Magenta
            'unknown': (128, 128, 128)     # Gray
        }
        return colors.get(method.lower(), colors['unknown'])
    
    def enhance_image(self, image_array: np.ndarray) -> np.ndarray:
        """Enhance image quality for better face recognition"""
        try:
            # Apply CLAHE for contrast enhancement
            if len(image_array.shape) == 3:
                lab = cv2.cvtColor(image_array, cv2.COLOR_RGB2LAB)
                l, a, b = cv2.split(lab)
                clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
                l = clahe.apply(l)
                lab = cv2.merge([l, a, b])
                enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
            else:
                clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
                enhanced = clahe.apply(image_array)
            
            # Apply slight sharpening
            kernel = np.array([[0, -1, 0],
                              [-1, 5, -1],
                              [0, -1, 0]])
            enhanced = cv2.filter2D(enhanced, -1, kernel)
            
            # Apply bilateral filter for noise reduction
            enhanced = cv2.bilateralFilter(enhanced, 9, 75, 75)
            
            return enhanced
        except Exception as e:
            logger.error(f"Image enhancement error: {str(e)}")
            return image_array
    
    def align_face(self, image_array: np.ndarray, face_bbox: Tuple) -> Optional[np.ndarray]:
        """Align face based on eye positions"""
        try:
            x, y, w, h = face_bbox
            
            # Extract face region
            face_region = image_array[y:y+h, x:x+w]
            
            if face_region.size == 0:
                return None
            
            # Convert to grayscale for eye detection
            gray_face = cv2.cvtColor(face_region, cv2.COLOR_RGB2GRAY)
            
            # Detect eyes
            eyes = self._detect_eyes(gray_face)
            
            if len(eyes) >= 2:
                # Calculate angle between eyes
                eye1, eye2 = eyes[:2]
                dx = eye2[0] - eye1[0]
                dy = eye2[1] - eye1[1]
                angle = np.degrees(np.arctan2(dy, dx))
                
                # Rotate image to align eyes horizontally
                center = (w // 2, h // 2)
                rotation_matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
                aligned = cv2.warpAffine(face_region, rotation_matrix, (w, h))
                
                return aligned
            
            # If eye detection fails, return original face
            return face_region
            
        except Exception as e:
            logger.error(f"Face alignment error: {str(e)}")
            return None
    
    def _detect_eyes(self, gray_face: np.ndarray) -> List[Tuple[int, int]]:
        """Detect eyes in face region"""
        try:
            # Load eye cascade
            eye_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + 'haarcascade_eye.xml'
            )
            
            eyes = eye_cascade.detectMultiScale(
                gray_face,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(20, 20)
            )
            
            # Convert to center points
            eye_centers = []
            for (ex, ey, ew, eh) in eyes:
                center_x = ex + ew // 2
                center_y = ey + eh // 2
                eye_centers.append((center_x, center_y))
            
            return eye_centers
            
        except Exception as e:
            logger.error(f"Eye detection error: {str(e)}")
            return []
    
    def calculate_blur_score(self, image_array: np.ndarray) -> float:
        """Calculate blur score (0-1, higher is sharper)"""
        try:
            if len(image_array.shape) == 3:
                gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
            else:
                gray = image_array
            
            # Use Laplacian variance for blur detection
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            # Normalize to 0-1 range
            # 0-100: very blurry, 100-500: acceptable, 500+: sharp
            blur_score = min(laplacian_var / 500.0, 1.0)
            
            return blur_score
            
        except Exception as e:
            logger.error(f"Blur score calculation error: {str(e)}")
            return 0.0
    
    def detect_face_landmarks(self, image_array: np.ndarray) -> Optional[Dict]:
        """Detect facial landmarks using MediaPipe"""
        if not self.MEDIAPIPE_AVAILABLE:
            return None
        
        try:
            with mp.solutions.face_mesh.FaceMesh(
                static_image_mode=True,
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5
            ) as face_mesh:
                results = face_mesh.process(cv2.cvtColor(image_array, cv2.COLOR_BGR2RGB))
                
                if results.multi_face_landmarks:
                    landmarks = results.multi_face_landmarks[0]
                    
                    # Convert landmarks to list of (x, y) coordinates
                    h, w = image_array.shape[:2]
                    landmark_points = []
                    for landmark in landmarks.landmark:
                        x = int(landmark.x * w)
                        y = int(landmark.y * h)
                        landmark_points.append((x, y))
                    
                    return {
                        'landmarks': landmark_points,
                        'num_landmarks': len(landmark_points),
                        'method': 'mediapipe'
                    }
            
            return None
            
        except Exception as e:
            logger.error(f"Landmark detection error: {str(e)}")
            return None
    
    def create_face_thumbnail(self, image_array: np.ndarray, face_bbox: Tuple, 
                            size: Tuple[int, int] = (100, 100)) -> Optional[np.ndarray]:
        """Create standardized face thumbnail"""
        try:
            x, y, w, h = face_bbox
            face_region = image_array[y:y+h, x:x+w]
            
            if face_region.size == 0:
                return None
            
            # Align face if possible
            aligned_face = self.align_face(image_array, face_bbox)
            if aligned_face is not None:
                face_region = aligned_face
            
            # Resize to standard size
            thumbnail = cv2.resize(face_region, size, interpolation=cv2.INTER_AREA)
            
            # Convert to base64 for storage/display
            _, buffer = cv2.imencode('.jpg', thumbnail)
            thumbnail_base64 = base64.b64encode(buffer).decode('utf-8')
            
            return {
                'image_array': thumbnail,
                'base64': thumbnail_base64,
                'size': size,
                'original_bbox': face_bbox
            }
            
        except Exception as e:
            logger.error(f"Thumbnail creation error: {str(e)}")
            return None

# Global instance
face_utils = FaceUtils()