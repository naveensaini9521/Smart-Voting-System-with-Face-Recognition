import cv2
import numpy as np
import logging
from typing import List, Tuple, Optional

logger = logging.getLogger(__name__)

class FaceUtils:
    @staticmethod
    def draw_face_rectangles(image_array: np.ndarray, faces: List[Tuple]) -> np.ndarray:
        """Draw rectangles around detected faces"""
        try:
            image_with_rectangles = image_array.copy()
            
            for (x, y, w, h) in faces:
                # Draw rectangle
                cv2.rectangle(image_with_rectangles, (x, y), (x + w, y + h), (0, 255, 0), 2)
                
                # Draw label
                cv2.putText(image_with_rectangles, 'Face', (x, y - 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
            
            return image_with_rectangles
        except Exception as e:
            logger.error(f"Error drawing face rectangles: {str(e)}")
            return image_array
    
    @staticmethod
    def enhance_image_quality(image_array: np.ndarray) -> np.ndarray:
        """Enhance image quality for better face recognition"""
        try:
            # Apply bilateral filter for noise reduction while preserving edges
            enhanced = cv2.bilateralFilter(image_array, 9, 75, 75)
            
            # Sharpen the image
            kernel = np.array([[-1, -1, -1],
                              [-1,  9, -1],
                              [-1, -1, -1]])
            enhanced = cv2.filter2D(enhanced, -1, kernel)
            
            return enhanced
        except Exception as e:
            logger.error(f"Error enhancing image: {str(e)}")
            return image_array
    
    @staticmethod
    def align_face(image_array: np.ndarray, face_rect: Tuple) -> Optional[np.ndarray]:
        """Align face based on eye positions (basic implementation)"""
        try:
            x, y, w, h = face_rect
            
            # Extract face region
            face_region = image_array[y:y+h, x:x+w]
            
            # Simple alignment: ensure face is upright
            # In production, you would use eye detection for proper alignment
            
            return face_region
        except Exception as e:
            logger.error(f"Error aligning face: {str(e)}")
            return None
    
    @staticmethod
    def calculate_face_quality_score(image_array: np.ndarray, face_rect: Tuple) -> float:
        """Calculate face quality score (0-1)"""
        try:
            x, y, w, h = face_rect
            
            # Extract face region
            face_region = image_array[y:y+h, x:x+w]
            
            # Calculate brightness score
            gray_face = cv2.cvtColor(face_region, cv2.COLOR_RGB2GRAY)
            brightness = np.mean(gray_face) / 255.0
            brightness_score = 1.0 - abs(brightness - 0.5)  # Ideal brightness around 0.5
            
            # Calculate contrast score
            contrast = np.std(gray_face) / 255.0
            contrast_score = min(contrast / 0.3, 1.0)  # Good contrast around 0.3+
            
            # Calculate sharpness score (using Laplacian variance)
            sharpness = cv2.Laplacian(gray_face, cv2.CV_64F).var()
            sharpness_score = min(sharpness / 100.0, 1.0)  # Good sharpness > 100
            
            # Calculate size score
            image_area = image_array.shape[0] * image_array.shape[1]
            face_area = w * h
            size_score = min(face_area / (image_area * 0.2), 1.0)  # Good if face is at least 20% of image
            
            # Combined quality score
            quality_score = (brightness_score * 0.25 + 
                           contrast_score * 0.25 + 
                           sharpness_score * 0.25 + 
                           size_score * 0.25)
            
            return float(quality_score)
            
        except Exception as e:
            logger.error(f"Error calculating face quality: {str(e)}")
            return 0.0

# Global instance
face_utils = FaceUtils()