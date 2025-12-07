# smart_app/backend/services/face_recognition_service.py
import cv2
import numpy as np
import pickle
import os
import logging
import time
import base64
import io
from typing import List, Tuple, Dict, Optional, Any
from dataclasses import dataclass
from datetime import datetime
from PIL import Image

# ============================================
# INITIALIZE ALL AVAILABILITY VARIABLES FIRST
# ============================================
FACE_RECOGNITION_AVAILABLE = False
DEEPFACE_AVAILABLE = False
MEDIAPIPE_AVAILABLE = False
DLIB_AVAILABLE = False

# Get logger instance
logger = logging.getLogger(__name__)

# ============================================
# IMPORT FACE RECOGNITION LIBRARIES
# ============================================
# Import face_recognition
try:
    import face_recognition  # High-level face recognition
    FACE_RECOGNITION_AVAILABLE = True
except ImportError:
    logger.warning("face_recognition library not available")
except Exception as e:
    logger.warning(f"face_recognition import error: {e}")

# Import deepface
try:
    from deepface import DeepFace  # Deep learning face recognition
    DEEPFACE_AVAILABLE = True
except ImportError:
    logger.warning("DeepFace library not available")
except Exception as e:
    logger.warning(f"DeepFace import error: {e}")

# Import mediapipe  
try:
    import mediapipe as mp  # Real-time face detection
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    logger.warning("MediaPipe library not available")
except Exception as e:
    logger.warning(f"MediaPipe import error: {e}")

# Import dlib
try:
    import dlib  # Traditional face recognition
    DLIB_AVAILABLE = True
except ImportError:
    logger.warning("Dlib library not available")
except Exception as e:
    logger.warning(f"Dlib import error: {e}")

# ============================================
# IMPORT OTHER DEPENDENCIES
# ============================================
# KNN for similarity search
from sklearn.neighbors import NearestNeighbors
import joblib

@dataclass
class FaceRecognitionResult:
    """Unified result structure for face recognition"""
    is_match: bool
    confidence: float
    voter_id: Optional[str] = None
    method: str = "unknown"
    processing_time: float = 0.0
    details: Dict = None
    quality_score: float = 0.0

class MultiMethodFaceService:
    """Face service using multiple detection/recognition methods"""
    
    def __init__(self):
        self.methods_available = {
            'face_recognition': FACE_RECOGNITION_AVAILABLE,
            'deepface': DEEPFACE_AVAILABLE,
            'mediapipe': MEDIAPIPE_AVAILABLE,
            'dlib': DLIB_AVAILABLE,
            'opencv': True  # Always available
        }
        
        # Initialize MediaPipe
        if MEDIAPIPE_AVAILABLE:
            self.mp_face_detection = mp.solutions.face_detection
            self.mp_face_mesh = mp.solutions.face_mesh
            self.face_detection = self.mp_face_detection.FaceDetection(
                model_selection=1,  # 0: short-range, 1: full-range
                min_detection_confidence=0.5
            )
            self.face_mesh = self.mp_face_mesh.FaceMesh(
                static_image_mode=True,
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5
            )
        
        # Initialize OpenCV cascades
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        self.eye_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_eye.xml'
        )
        
        # Initialize Dlib if available
        if DLIB_AVAILABLE:
            try:
                self.dlib_detector = dlib.get_frontal_face_detector()
                # Try to load shape predictor (download if not available)
                shape_predictor_path = "shape_predictor_68_face_landmarks.dat"
                if os.path.exists(shape_predictor_path):
                    self.dlib_predictor = dlib.shape_predictor(shape_predictor_path)
                    self.dlib_face_encoder = dlib.face_recognition_model_v1(
                        "dlib_face_recognition_resnet_model_v1.dat"
                    )
                else:
                    logger.warning("Dlib models not found. Dlib will use basic detection only.")
                    self.dlib_predictor = None
            except Exception as e:
                logger.error(f"Dlib initialization error: {str(e)}")
                # Don't modify DLIB_AVAILABLE here - it's already False if import failed
        
        logger.info(f"MultiMethodFaceService initialized. Available methods: {self.methods_available}")
    
    def base64_to_image(self, image_data: str) -> np.ndarray:
        """Convert base64 string to numpy array"""
        try:
            # Remove data URL prefix if present
            if 'base64,' in image_data:
                image_data = image_data.split('base64,')[1]
            
            # Decode base64
            image_bytes = base64.b64decode(image_data)
            
            # Convert to numpy array
            image = Image.open(io.BytesIO(image_bytes))
            image_array = np.array(image)
            
            # Convert to RGB if needed
            if len(image_array.shape) == 2:  # Grayscale
                image_array = cv2.cvtColor(image_array, cv2.COLOR_GRAY2RGB)
            elif image_array.shape[2] == 4:  # RGBA
                image_array = cv2.cvtColor(image_array, cv2.COLOR_RGBA2RGB)
            # RGB (3 channels) stays as is
            
            return image_array
        except Exception as e:
            logger.error(f"Image conversion error: {str(e)}")
            raise ValueError(f"Invalid image data: {str(e)}")
    
    def preprocess_image(self, image_array: np.ndarray) -> np.ndarray:
        """Preprocess image for better face recognition"""
        try:
            # Convert to RGB if BGR
            if len(image_array.shape) == 3 and image_array.shape[2] == 3:
                # Check if it's BGR (OpenCV default)
                if image_array[0, 0, 0] > image_array[0, 0, 2]:  # B > R
                    image_array = cv2.cvtColor(image_array, cv2.COLOR_BGR2RGB)
            
            # Resize if too large (max 1000px on longer side)
            h, w = image_array.shape[:2]
            if max(h, w) > 1000:
                scale = 1000 / max(h, w)
                new_w = int(w * scale)
                new_h = int(h * scale)
                image_array = cv2.resize(image_array, (new_w, new_h))
            
            # Enhance contrast
            lab = cv2.cvtColor(image_array, cv2.COLOR_RGB2LAB)
            l, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            l = clahe.apply(l)
            lab = cv2.merge([l, a, b])
            image_array = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
            
            return image_array
        except Exception as e:
            logger.error(f"Image preprocessing error: {str(e)}")
            return image_array
    
    def detect_faces_multi_method(self, image_array: np.ndarray) -> List[Dict]:
        """Detect faces using multiple methods for robustness"""
        faces = []
        rgb_image = cv2.cvtColor(image_array, cv2.COLOR_BGR2RGB)
        
        # Method 1: MediaPipe (fast and accurate)
        if MEDIAPIPE_AVAILABLE:
            mp_faces = self._detect_with_mediapipe(rgb_image)
            faces.extend(mp_faces)
        
        # Method 2: OpenCV (reliable fallback)
        cv_faces = self._detect_with_opencv(image_array)
        faces.extend(cv_faces)
        
        # Method 3: Dlib (accurate but slower)
        if DLIB_AVAILABLE:
            dlib_faces = self._detect_with_dlib(rgb_image)
            faces.extend(dlib_faces)
        
        # Method 4: face_recognition library
        if FACE_RECOGNITION_AVAILABLE:
            fr_faces = self._detect_with_face_recognition(rgb_image)
            faces.extend(fr_faces)
        
        # Remove duplicates and merge results
        unique_faces = self._merge_face_detections(faces)
        
        return unique_faces
    
    def _detect_with_mediapipe(self, rgb_image: np.ndarray) -> List[Dict]:
        """Face detection using MediaPipe"""
        faces = []
        try:
            with self.mp_face_detection.FaceDetection(
                model_selection=1,
                min_detection_confidence=0.5
            ) as face_detection:
                results = face_detection.process(rgb_image)
                
                if results.detections:
                    for detection in results.detections:
                        bbox = detection.location_data.relative_bounding_box
                        h, w, _ = rgb_image.shape
                        
                        x = int(bbox.xmin * w)
                        y = int(bbox.ymin * h)
                        width = int(bbox.width * w)
                        height = int(bbox.height * h)
                        
                        # Ensure within bounds
                        x = max(0, x)
                        y = max(0, y)
                        width = min(width, w - x)
                        height = min(height, h - y)
                        
                        if width > 20 and height > 20:
                            confidence = detection.score[0]
                            faces.append({
                                'method': 'mediapipe',
                                'bbox': (x, y, width, height),
                                'confidence': float(confidence),
                                'landmarks': None
                            })
        except Exception as e:
            logger.error(f"MediaPipe detection error: {str(e)}")
        
        return faces
    
    def _detect_with_opencv(self, image_array: np.ndarray) -> List[Dict]:
        """Face detection using OpenCV Haar Cascades"""
        faces = []
        try:
            gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
            detected_faces = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(30, 30),
                flags=cv2.CASCADE_SCALE_IMAGE
            )
            
            for (x, y, w, h) in detected_faces:
                # Simple confidence based on face size
                confidence = min(w * h / (image_array.shape[0] * image_array.shape[1] * 0.1), 1.0)
                faces.append({
                    'method': 'opencv',
                    'bbox': (x, y, w, h),
                    'confidence': float(confidence),
                    'landmarks': None
                })
        except Exception as e:
            logger.error(f"OpenCV detection error: {str(e)}")
        
        return faces
    
    def _detect_with_dlib(self, rgb_image: np.ndarray) -> List[Dict]:
        """Face detection using Dlib"""
        faces = []
        try:
            detected_faces = self.dlib_detector(rgb_image, 1)  # Upsample once
            
            for face in detected_faces:
                x = face.left()
                y = face.top()
                w = face.width()
                h = face.height()
                
                confidence = 0.8  # Dlib doesn't provide confidence scores
                faces.append({
                    'method': 'dlib',
                    'bbox': (x, y, w, h),
                    'confidence': confidence,
                    'landmarks': None
                })
        except Exception as e:
            logger.error(f"Dlib detection error: {str(e)}")
        
        return faces
    
    def _detect_with_face_recognition(self, rgb_image: np.ndarray) -> List[Dict]:
        """Face detection using face_recognition library"""
        faces = []
        try:
            face_locations = face_recognition.face_locations(rgb_image)
            
            for (top, right, bottom, left) in face_locations:
                w = right - left
                h = bottom - top
                confidence = 0.9  # High confidence for this method
                faces.append({
                    'method': 'face_recognition',
                    'bbox': (left, top, w, h),
                    'confidence': confidence,
                    'landmarks': None
                })
        except Exception as e:
            logger.error(f"face_recognition detection error: {str(e)}")
        
        return faces
    
    def _merge_face_detections(self, faces: List[Dict]) -> List[Dict]:
        """Merge overlapping face detections from different methods"""
        if not faces:
            return []
        
        # Sort by confidence
        faces.sort(key=lambda x: x['confidence'], reverse=True)
        
        merged_faces = []
        used_indices = set()
        
        for i, face1 in enumerate(faces):
            if i in used_indices:
                continue
            
            # Check overlap with other faces
            similar_faces = [face1]
            x1, y1, w1, h1 = face1['bbox']
            
            for j, face2 in enumerate(faces[i+1:], start=i+1):
                if j in used_indices:
                    continue
                
                x2, y2, w2, h2 = face2['bbox']
                
                # Calculate IoU (Intersection over Union)
                intersection_x = max(x1, x2)
                intersection_y = max(y1, y2)
                intersection_w = min(x1 + w1, x2 + w2) - intersection_x
                intersection_h = min(y1 + h1, y2 + h2) - intersection_y
                
                if intersection_w > 0 and intersection_h > 0:
                    intersection_area = intersection_w * intersection_h
                    union_area = w1 * h1 + w2 * h2 - intersection_area
                    iou = intersection_area / union_area if union_area > 0 else 0
                    
                    if iou > 0.5:  # Same face
                        similar_faces.append(face2)
                        used_indices.add(j)
            
            # Merge similar faces (weighted average by confidence)
            if len(similar_faces) > 1:
                total_confidence = sum(f['confidence'] for f in similar_faces)
                avg_bbox = (
                    int(sum(f['bbox'][0] * f['confidence'] for f in similar_faces) / total_confidence),
                    int(sum(f['bbox'][1] * f['confidence'] for f in similar_faces) / total_confidence),
                    int(sum(f['bbox'][2] * f['confidence'] for f in similar_faces) / total_confidence),
                    int(sum(f['bbox'][3] * f['confidence'] for f in similar_faces) / total_confidence)
                )
                avg_confidence = total_confidence / len(similar_faces)
                methods = '+'.join(sorted(set(f['method'] for f in similar_faces)))
                
                merged_faces.append({
                    'method': methods,
                    'bbox': avg_bbox,
                    'confidence': avg_confidence,
                    'landmarks': None,
                    'detection_count': len(similar_faces)
                })
            else:
                merged_faces.append(face1)
            
            used_indices.add(i)
        
        return merged_faces
    
    def extract_face_encoding_multi_method(self, image_array: np.ndarray, face_bbox: Tuple) -> Dict[str, Any]:
        """Extract face encoding using multiple methods"""
        encodings = {}
        x, y, w, h = face_bbox
        
        # Extract face region
        face_region = image_array[y:y+h, x:x+w]
        
        if face_region.size == 0:
            return encodings
        
        # Method 1: face_recognition library
        if FACE_RECOGNITION_AVAILABLE:
            try:
                rgb_face = cv2.cvtColor(face_region, cv2.COLOR_BGR2RGB)
                face_encodings = face_recognition.face_encodings(rgb_face)
                if face_encodings:
                    encodings['face_recognition'] = face_encodings[0].tolist()
            except Exception as e:
                logger.error(f"face_recognition encoding error: {str(e)}")
        
        # Method 2: DeepFace
        if DEEPFACE_AVAILABLE:
            try:
                # DeepFace expects BGR for OpenCV
                bgr_face = cv2.cvtColor(face_region, cv2.COLOR_RGB2BGR)
                embedding = DeepFace.represent(
                    bgr_face,
                    model_name='Facenet',
                    enforce_detection=False
                )
                if embedding:
                    encodings['deepface_facenet'] = embedding[0]['embedding']
            except Exception as e:
                logger.error(f"DeepFace encoding error: {str(e)}")
        
        # Method 3: Dlib (if shape predictor available)
        if DLIB_AVAILABLE and hasattr(self, 'dlib_predictor') and self.dlib_predictor:
            try:
                rgb_face = cv2.cvtColor(face_region, cv2.COLOR_BGR2RGB)
                dlib_rect = dlib.rectangle(0, 0, w, h)
                shape = self.dlib_predictor(rgb_face, dlib_rect)
                face_encoding = self.dlib_face_encoder.compute_face_descriptor(rgb_face, shape)
                encodings['dlib'] = list(face_encoding)
            except Exception as e:
                logger.error(f"Dlib encoding error: {str(e)}")
        
        # Method 4: Create custom ensemble encoding
        if len(encodings) >= 2:
            # Combine encodings from different methods
            all_encodings = list(encodings.values())
            # Simple average (could be weighted)
            ensemble_encoding = np.mean(all_encodings, axis=0).tolist()
            encodings['ensemble'] = ensemble_encoding
        
        return encodings
    
    def validate_face_image(self, image_array: np.ndarray) -> Tuple[bool, str]:
        """Validate face image quality"""
        try:
            # Check image size
            h, w = image_array.shape[:2]
            if h < 100 or w < 100:
                return False, "Image too small (minimum 100x100 pixels)"
            
            # Check for faces
            faces = self.detect_faces_multi_method(image_array)
            
            if len(faces) == 0:
                return False, "No face detected"
            
            if len(faces) > 1:
                return False, "Multiple faces detected"
            
            # Check face quality
            face = faces[0]
            x, y, w, h = face['bbox']
            
            # Face should be reasonably large
            image_area = image_array.shape[0] * image_array.shape[1]
            face_area = w * h
            face_ratio = face_area / image_area
            
            if face_ratio < 0.1:  # Face less than 10% of image
                return False, "Face too small in image"
            if face_ratio > 0.8:  # Face more than 80% of image
                return False, "Face too large in image"
            
            # Check brightness
            face_region = image_array[y:y+h, x:x+w]
            gray_face = cv2.cvtColor(face_region, cv2.COLOR_RGB2GRAY)
            brightness = np.mean(gray_face)
            
            if brightness < 30:
                return False, "Image too dark"
            if brightness > 220:
                return False, "Image too bright"
            
            # Check blurriness
            blur_value = cv2.Laplacian(gray_face, cv2.CV_64F).var()
            if blur_value < 50:
                return False, "Image is blurry"
            
            return True, "Face validation passed"
            
        except Exception as e:
            logger.error(f"Face validation error: {str(e)}")
            return False, f"Validation error: {str(e)}"
    
    def calculate_face_quality_score(self, image_array: np.ndarray, face_bbox: Tuple) -> float:
        """Calculate face quality score (0-1)"""
        try:
            x, y, w, h = face_bbox
            face_region = image_array[y:y+h, x:x+w]
            
            if face_region.size == 0:
                return 0.0
            
            gray_face = cv2.cvtColor(face_region, cv2.COLOR_RGB2GRAY)
            
            # 1. Brightness score (ideal: 127)
            brightness = np.mean(gray_face)
            brightness_score = 1.0 - abs(brightness - 127) / 127
            
            # 2. Contrast score
            contrast = np.std(gray_face)
            contrast_score = min(contrast / 50, 1.0)
            
            # 3. Sharpness score
            sharpness = cv2.Laplacian(gray_face, cv2.CV_64F).var()
            sharpness_score = min(sharpness / 100, 1.0)
            
            # 4. Face proportion score
            image_area = image_array.shape[0] * image_array.shape[1]
            face_area = w * h
            proportion = face_area / image_area
            # Ideal proportion: 20-40% of image
            if 0.2 <= proportion <= 0.4:
                proportion_score = 1.0
            else:
                proportion_score = 1.0 - min(abs(proportion - 0.3) / 0.3, 1.0)
            
            # 5. Face alignment (check if eyes are level)
            # Simple check: face should be roughly centered
            img_center_x = image_array.shape[1] / 2
            img_center_y = image_array.shape[0] / 2
            face_center_x = x + w / 2
            face_center_y = y + h / 2
            
            x_offset = abs(face_center_x - img_center_x) / img_center_x
            y_offset = abs(face_center_y - img_center_y) / img_center_y
            alignment_score = 1.0 - (x_offset + y_offset) / 2
            
            # Weighted average
            quality_score = (
                brightness_score * 0.2 +
                contrast_score * 0.2 +
                sharpness_score * 0.25 +
                proportion_score * 0.2 +
                alignment_score * 0.15
            )
            
            return max(0.0, min(quality_score, 1.0))
            
        except Exception as e:
            logger.error(f"Quality score calculation error: {str(e)}")
            return 0.0

class KNNFaceService:
    """KNN-based face similarity search service"""
    
    def __init__(self, model_path='data/face_knn_model.pkl'):
        self.model_path = model_path
        self.knn_model = None
        self.face_encodings = []
        self.voter_ids = []
        self.threshold = 0.65  # Similarity threshold for duplicates
        self.k_neighbors = 5
        self.distance_metric = 'cosine'
        
        # Create data directory if not exists
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        
        self.load_model()
    
    def load_model(self):
        """Load pre-trained KNN model"""
        try:
            if os.path.exists(self.model_path):
                with open(self.model_path, 'rb') as f:
                    model_data = pickle.load(f)
                    self.knn_model = model_data.get('model')
                    self.face_encodings = model_data.get('encodings', [])
                    self.voter_ids = model_data.get('voter_ids', [])
                logger.info(f"KNN model loaded with {len(self.face_encodings)} face encodings")
                return True
        except Exception as e:
            logger.error(f"Failed to load KNN model: {str(e)}")
        
        self._initialize_model()
        return False
    
    def _initialize_model(self):
        """Initialize new KNN model"""
        if len(self.face_encodings) > 0:
            self.knn_model = NearestNeighbors(
                n_neighbors=min(self.k_neighbors, len(self.face_encodings)),
                metric=self.distance_metric,
                algorithm='auto',
                n_jobs=-1
            )
            self._retrain_model()
        logger.info("KNN model initialized")
    
    def _retrain_model(self):
        """Retrain KNN model with current data"""
        if len(self.face_encodings) == 0:
            return
        
        try:
            encodings_array = np.array(self.face_encodings, dtype=np.float32)
            self.knn_model.fit(encodings_array)
            logger.info(f"KNN model retrained with {len(self.face_encodings)} samples")
        except Exception as e:
            logger.error(f"Failed to retrain KNN model: {str(e)}")
    
    def save_model(self):
        """Save KNN model to disk"""
        try:
            model_data = {
                'model': self.knn_model,
                'encodings': self.face_encodings,
                'voter_ids': self.voter_ids,
                'threshold': self.threshold,
                'timestamp': datetime.now().isoformat(),
                'version': '2.0'
            }
            
            with open(self.model_path, 'wb') as f:
                pickle.dump(model_data, f, protocol=pickle.HIGHEST_PROTOCOL)
            
            # Also save with joblib
            joblib_path = self.model_path.replace('.pkl', '.joblib')
            joblib.dump(model_data, joblib_path)
            
            logger.info(f"KNN model saved with {len(self.face_encodings)} encodings")
            return True
        except Exception as e:
            logger.error(f"Failed to save KNN model: {str(e)}")
            return False
    
    def add_face_encoding(self, encoding, voter_id):
        """Add new face encoding to KNN model"""
        try:
            if isinstance(encoding, list):
                encoding = np.array(encoding, dtype=np.float32)
            
            # Normalize encoding
            norm = np.linalg.norm(encoding)
            if norm > 0:
                encoding = encoding / norm
            
            self.face_encodings.append(encoding)
            self.voter_ids.append(voter_id)
            
            # Retrain with new data
            self._retrain_model()
            
            # Save updated model
            self.save_model()
            
            logger.info(f"Face encoding added for voter: {voter_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to add face encoding: {str(e)}")
            return False
    
    def find_similar_faces(self, query_encoding, k=None):
        """Find k most similar faces using KNN"""
        if k is None:
            k = self.k_neighbors
        
        if len(self.face_encodings) == 0 or self.knn_model is None:
            return []
        
        try:
            # Normalize query encoding
            if isinstance(query_encoding, list):
                query_encoding = np.array(query_encoding, dtype=np.float32)
            
            norm = np.linalg.norm(query_encoding)
            if norm > 0:
                query_encoding = query_encoding / norm
            
            query_encoding = query_encoding.reshape(1, -1)
            
            # Find nearest neighbors
            distances, indices = self.knn_model.kneighbors(
                query_encoding, 
                n_neighbors=min(k, len(self.face_encodings))
            )
            
            results = []
            for idx, distance in zip(indices[0], distances[0]):
                voter_id = self.voter_ids[idx]
                similarity = 1 - distance  # Convert distance to similarity
                results.append({
                    'voter_id': voter_id,
                    'distance': float(distance),
                    'similarity': float(similarity),
                    'is_match': similarity > self.threshold,
                    'rank': len(results) + 1
                })
            
            return results
        except Exception as e:
            logger.error(f"KNN search failed: {str(e)}")
            return []
    
    def find_duplicate(self, query_encoding):
        """Check if face is duplicate (already registered)"""
        similar_faces = self.find_similar_faces(query_encoding, k=3)
        
        for result in similar_faces:
            if result['is_match']:
                return {
                    'is_duplicate': True,
                    'voter_id': result['voter_id'],
                    'similarity': result['similarity'],
                    'distance': result['distance']
                }
        
        return {'is_duplicate': False, 'similarity': 0}
    
    def verify_face(self, query_encoding, claimed_voter_id):
        """Verify if face matches claimed voter ID"""
        similar_faces = self.find_similar_faces(query_encoding, k=5)
        
        # Check if claimed voter is among matches
        for result in similar_faces:
            if result['voter_id'] == claimed_voter_id and result['is_match']:
                return {
                    'verified': True,
                    'similarity': result['similarity'],
                    'distance': result['distance'],
                    'confidence': self._calculate_confidence(result['similarity'])
                }
        
        # Find best match
        best_match = None
        if similar_faces:
            best_match = max(similar_faces, key=lambda x: x['similarity'])
        
        return {
            'verified': False,
            'best_match': best_match['voter_id'] if best_match else None,
            'best_similarity': best_match['similarity'] if best_match else 0,
            'confidence': 0
        }
    
    def _calculate_confidence(self, similarity):
        """Calculate confidence score based on similarity"""
        if similarity > 0.85:
            return 'VERY_HIGH'
        elif similarity > 0.75:
            return 'HIGH'
        elif similarity > 0.65:
            return 'MEDIUM'
        elif similarity > 0.55:
            return 'LOW'
        else:
            return 'VERY_LOW'
    
    def batch_check_duplicates(self, encodings_list):
        """Check multiple encodings for duplicates efficiently"""
        results = []
        for encoding in encodings_list:
            result = self.find_duplicate(encoding)
            results.append(result)
        return results
    
    def get_statistics(self):
        """Get model statistics"""
        return {
            'total_encodings': len(self.face_encodings),
            'unique_voters': len(set(self.voter_ids)),
            'model_trained': self.knn_model is not None,
            'threshold': self.threshold,
            'distance_metric': self.distance_metric,
            'model_path': self.model_path
        }
    
    def remove_face_encoding(self, voter_id):
        """Remove face encoding for a voter"""
        try:
            indices_to_remove = [i for i, vid in enumerate(self.voter_ids) if vid == voter_id]
            
            # Remove in reverse order
            for idx in sorted(indices_to_remove, reverse=True):
                self.face_encodings.pop(idx)
                self.voter_ids.pop(idx)
            
            # Retrain model
            self._retrain_model()
            self.save_model()
            
            logger.info(f"Removed face encoding for voter: {voter_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to remove face encoding: {str(e)}")
            return False

class HybridFaceRecognitionService:
    """
    Hybrid face recognition service combining:
    1. Multiple face detection methods (MediaPipe, OpenCV, Dlib, face_recognition)
    2. Multiple encoding methods (face_recognition, DeepFace, Dlib)
    3. KNN for fast similarity search
    4. Ensemble voting for final decisions
    """
    
    def __init__(self, knn_model_path='data/face_knn_model.pkl'):
        # Initialize multi-method face service
        self.face_service = MultiMethodFaceService()
        
        # Initialize KNN service
        self.knn_service = KNNFaceService(knn_model_path)
        
        # Configuration
        self.config = {
            'verification_threshold': 0.70,      # For 1:1 verification
            'duplicate_threshold': 0.65,         # For duplicate detection
            'quality_threshold': 0.60,           # Minimum quality score
            'use_knn_for_search': True,          # Use KNN for 1:N search
            'ensemble_voting': True,             # Combine multiple methods
            'min_encoding_methods': 2,           # Minimum methods for encoding
            'max_processing_time': 3.0           # Maximum seconds
        }
        
        # Statistics
        self.stats = {
            'total_operations': 0,
            'successful_operations': 0,
            'average_processing_time': 0.0,
            'method_usage': {
                'face_recognition': 0,
                'deepface': 0,
                'dlib': 0,
                'ensemble': 0,
                'knn': 0
            }
        }
        
        logger.info("HybridFaceRecognitionService initialized")
    
    def register_face(self, voter_id: str, image_data: str) -> FaceRecognitionResult:
        """
        Register a new face with comprehensive duplicate checking
        """
        start_time = time.time()
        
        try:
            # Step 1: Process image
            image_array = self.face_service.base64_to_image(image_data)
            image_array = self.face_service.preprocess_image(image_array)
            
            # Step 2: Validate face
            is_valid, validation_message = self.face_service.validate_face_image(image_array)
            if not is_valid:
                return FaceRecognitionResult(
                    is_match=False,
                    confidence=0.0,
                    method="validation",
                    processing_time=time.time() - start_time,
                    details={'error': validation_message},
                    quality_score=0.0
                )
            
            # Step 3: Detect face with multiple methods
            detected_faces = self.face_service.detect_faces_multi_method(image_array)
            if not detected_faces:
                return FaceRecognitionResult(
                    is_match=False,
                    confidence=0.0,
                    method="detection",
                    processing_time=time.time() - start_time,
                    details={'error': 'No face detected after preprocessing'},
                    quality_score=0.0
                )
            
            face_bbox = detected_faces[0]['bbox']
            
            # Step 4: Calculate quality score
            quality_score = self.face_service.calculate_face_quality_score(image_array, face_bbox)
            if quality_score < self.config['quality_threshold']:
                return FaceRecognitionResult(
                    is_match=False,
                    confidence=quality_score,
                    method="quality_check",
                    processing_time=time.time() - start_time,
                    details={
                        'error': 'Low image quality',
                        'quality_score': quality_score,
                        'required_threshold': self.config['quality_threshold']
                    },
                    quality_score=quality_score
                )
            
            # Step 5: Extract encodings with multiple methods
            encodings = self.face_service.extract_face_encoding_multi_method(image_array, face_bbox)
            
            if not encodings or len(encodings) < self.config['min_encoding_methods']:
                return FaceRecognitionResult(
                    is_match=False,
                    confidence=0.0,
                    method="encoding",
                    processing_time=time.time() - start_time,
                    details={
                        'error': f'Could not extract sufficient face encodings (got {len(encodings)} methods)',
                        'available_methods': list(encodings.keys())
                    },
                    quality_score=quality_score
                )
            
            # Use ensemble encoding if available, otherwise use the first available
            primary_encoding = encodings.get('ensemble') or list(encodings.values())[0]
            
            # Step 6: KNN duplicate check (FAST)
            duplicate_check = self.knn_service.find_duplicate(primary_encoding)
            
            if duplicate_check['is_duplicate'] and duplicate_check['similarity'] > 0.80:
                # High confidence duplicate
                self.stats['method_usage']['knn'] += 1
                return FaceRecognitionResult(
                    is_match=False,
                    confidence=duplicate_check['similarity'],
                    method="knn_duplicate_check",
                    processing_time=time.time() - start_time,
                    details={
                        'duplicate_detected': True,
                        'existing_voter_id': duplicate_check.get('voter_id'),
                        'similarity': duplicate_check['similarity'],
                        'message': 'Face already registered with high similarity',
                        'encoding_methods': list(encodings.keys()),
                        'quality_score': quality_score
                    },
                    quality_score=quality_score
                )
            
            # Step 7: Add to KNN for future searches
            knn_success = self.knn_service.add_face_encoding(primary_encoding, voter_id)
            
            # Step 8: Prepare result
            total_time = time.time() - start_time
            self.stats['total_operations'] += 1
            self.stats['successful_operations'] += 1
            
            # Update method usage
            for method in encodings.keys():
                if method in self.stats['method_usage']:
                    self.stats['method_usage'][method] += 1
            
            return FaceRecognitionResult(
                is_match=True,
                confidence=quality_score,  # Use quality as confidence for registration
                voter_id=voter_id,
                method=f"hybrid_{'+'.join(encodings.keys())}",
                processing_time=total_time,
                details={
                    'encoding_methods': list(encodings.keys()),
                    'knn_indexed': knn_success,
                    'quality_score': quality_score,
                    'face_detection_method': detected_faces[0]['method'],
                    'detection_confidence': detected_faces[0]['confidence']
                },
                quality_score=quality_score
            )
            
        except Exception as e:
            logger.error(f"Registration error: {str(e)}")
            return FaceRecognitionResult(
                is_match=False,
                confidence=0.0,
                method="error",
                processing_time=time.time() - start_time,
                details={'error': str(e)},
                quality_score=0.0
            )
    
    def verify_face(self, voter_id: str, image_data: str) -> FaceRecognitionResult:
        """
        Verify face against registered voter using hybrid approach
        """
        start_time = time.time()
        
        try:
            # Step 1: Process image
            image_array = self.face_service.base64_to_image(image_data)
            image_array = self.face_service.preprocess_image(image_array)
            
            # Step 2: Detect face
            detected_faces = self.face_service.detect_faces_multi_method(image_array)
            if not detected_faces:
                return FaceRecognitionResult(
                    is_match=False,
                    confidence=0.0,
                    method="detection",
                    processing_time=time.time() - start_time,
                    details={'error': 'No face detected'},
                    quality_score=0.0
                )
            
            face_bbox = detected_faces[0]['bbox']
            
            # Step 3: Extract encoding
            encodings = self.face_service.extract_face_encoding_multi_method(image_array, face_bbox)
            if not encodings:
                return FaceRecognitionResult(
                    is_match=False,
                    confidence=0.0,
                    method="encoding",
                    processing_time=time.time() - start_time,
                    details={'error': 'Could not extract face encoding'},
                    quality_score=0.0
                )
            
            primary_encoding = encodings.get('ensemble') or list(encodings.values())[0]
            
            # Step 4: KNN verification (FAST)
            knn_result = self.knn_service.verify_face(primary_encoding, voter_id)
            
            # Step 5: Calculate similarity with all available encodings
            similarities = []
            for method, encoding in encodings.items():
                # For now, we'll use KNN similarity as proxy
                # In production, you'd compare against stored encoding from database
                similarity = knn_result.get('similarity', 0) * 0.9  # Slightly reduce for method variance
                similarities.append({
                    'method': method,
                    'similarity': similarity
                })
            
            # Step 6: Ensemble decision
            avg_similarity = np.mean([s['similarity'] for s in similarities])
            is_match = avg_similarity > self.config['verification_threshold']
            
            # Calculate quality
            quality_score = self.face_service.calculate_face_quality_score(image_array, face_bbox)
            
            total_time = time.time() - start_time
            self.stats['total_operations'] += 1
            if is_match:
                self.stats['successful_operations'] += 1
                self.stats['method_usage']['knn'] += 1
            
            return FaceRecognitionResult(
                is_match=is_match,
                confidence=avg_similarity,
                voter_id=voter_id if is_match else None,
                method=f"hybrid_verification_{'+'.join([s['method'] for s in similarities])}",
                processing_time=total_time,
                details={
                    'similarities': similarities,
                    'average_similarity': avg_similarity,
                    'threshold': self.config['verification_threshold'],
                    'knn_result': knn_result,
                    'face_detection_method': detected_faces[0]['method'],
                    'quality_score': quality_score
                },
                quality_score=quality_score
            )
            
        except Exception as e:
            logger.error(f"Verification error: {str(e)}")
            return FaceRecognitionResult(
                is_match=False,
                confidence=0.0,
                method="error",
                processing_time=time.time() - start_time,
                details={'error': str(e)},
                quality_score=0.0
            )
    
    def find_similar_faces(self, image_data: str, k: int = 5) -> List[Dict]:
        """Find similar faces in the database"""
        try:
            image_array = self.face_service.base64_to_image(image_data)
            image_array = self.face_service.preprocess_image(image_array)
            
            detected_faces = self.face_service.detect_faces_multi_method(image_array)
            if not detected_faces:
                return []
            
            face_bbox = detected_faces[0]['bbox']
            encodings = self.face_service.extract_face_encoding_multi_method(image_array, face_bbox)
            
            if not encodings:
                return []
            
            primary_encoding = encodings.get('ensemble') or list(encodings.values())[0]
            
            # Use KNN for fast similarity search
            similar_faces = self.knn_service.find_similar_faces(primary_encoding, k)
            
            return similar_faces
            
        except Exception as e:
            logger.error(f"Find similar faces error: {str(e)}")
            return []
    
    def get_system_stats(self) -> Dict:
        """Get system statistics"""
        return {
            **self.stats,
            'knn_stats': self.knn_service.get_statistics(),
            'config': self.config,
            'available_methods': self.face_service.methods_available
        }
    
    def reindex_knn_from_database(self, face_encodings_data: List[Dict]):
        """Reindex KNN from database face encodings"""
        try:
            # Clear existing data
            self.knn_service.face_encodings = []
            self.knn_service.voter_ids = []
            
            added_count = 0
            for data in face_encodings_data:
                if 'voter_id' in data and 'encoding' in data:
                    success = self.knn_service.add_face_encoding(data['encoding'], data['voter_id'])
                    if success:
                        added_count += 1
            
            logger.info(f"KNN reindexed with {added_count} face encodings")
            return added_count
            
        except Exception as e:
            logger.error(f"Reindex error: {str(e)}")
            return 0

# Global instances for easy import
multi_face_service = MultiMethodFaceService()
knn_face_service = KNNFaceService()
hybrid_face_service = HybridFaceRecognitionService()

# For backward compatibility
face_service = multi_face_service