// utils/imageUtils.js

export const imageUtils = {
  /**
   * Convert image data to consistent base64 format
   */
  normalizeImageData: (imageData) => {
    if (!imageData) {
      console.error('No image data provided');
      return null;
    }
    
    console.log('🛠️ Normalizing image data:', {
      type: typeof imageData,
      length: imageData.length,
      isDataURL: imageData.startsWith('data:image/')
    });
    
    // If it's already a pure base64 string
    if (typeof imageData === 'string' && !imageData.startsWith('data:image/')) {
      return imageData;
    }
    
    // If it's a data URL
    if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
      try {
        const commaIndex = imageData.indexOf(',');
        if (commaIndex === -1) {
          throw new Error('Invalid data URL format');
        }
        return imageData.substring(commaIndex + 1);
      } catch (error) {
        console.error('Error extracting base64:', error);
        return null;
      }
    }
    
    // If it's a File or Blob
    if (imageData instanceof File || imageData instanceof Blob) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target.result;
          const normalized = imageUtils.normalizeImageData(base64);
          resolve(normalized);
        };
        reader.readAsDataURL(imageData);
      });
    }
    
    console.error('Unsupported image format:', typeof imageData);
    return null;
  },
  
  /**
   * Validate image quality
   */
  validateImageQuality: (imageData) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Check minimum dimensions
        const minWidth = 100;
        const minHeight = 100;
        
        if (img.width < minWidth || img.height < minHeight) {
          resolve({
            valid: false,
            reason: `Image too small. Minimum ${minWidth}x${minHeight} required.`,
            width: img.width,
            height: img.height
          });
          return;
        }
        
        // Check aspect ratio (should be roughly square for faces)
        const aspectRatio = img.width / img.height;
        if (aspectRatio < 0.5 || aspectRatio > 2) {
          resolve({
            valid: false,
            reason: `Unusual aspect ratio. Expected near 1:1 for face images.`,
            aspectRatio: aspectRatio.toFixed(2)
          });
          return;
        }
        
        resolve({
          valid: true,
          width: img.width,
          height: img.height,
          aspectRatio: aspectRatio.toFixed(2)
        });
      };
      
      img.onerror = () => {
        resolve({
          valid: false,
          reason: 'Failed to load image'
        });
      };
      
      // Convert to data URL if needed
      if (typeof imageData === 'string' && !imageData.startsWith('data:image/')) {
        img.src = `data:image/jpeg;base64,${imageData}`;
      } else if (imageData.startsWith('data:image/')) {
        img.src = imageData;
      } else {
        resolve({
          valid: false,
          reason: 'Invalid image format'
        });
      }
    });
  },
  
  /**
   * Create image preview URL
   */
  createPreviewUrl: (imageData) => {
    if (!imageData) return null;
    
    if (imageData.startsWith('data:image/')) {
      return imageData;
    }
    
    return `data:image/jpeg;base64,${imageData}`;
  },
  
  /**
   * Compress image for API transmission
   */
  compressImage: async (imageData, maxSizeKB = 500) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate new dimensions (max 800px)
        const maxDimension = 800;
        let width = img.width;
        let height = img.height;
        
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          } else {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 with quality
        let quality = 0.9;
        let compressedData = canvas.toDataURL('image/jpeg', quality);
        
        // Reduce quality if still too large
        while (compressedData.length > maxSizeKB * 1024 && quality > 0.1) {
          quality -= 0.1;
          compressedData = canvas.toDataURL('image/jpeg', quality);
        }
        
        // Extract base64 part
        const base64Data = compressedData.split(',')[1];
        resolve(base64Data);
      };
      
      img.onerror = () => {
        resolve(imageData); // Return original if compression fails
      };
      
      if (typeof imageData === 'string' && !imageData.startsWith('data:image/')) {
        img.src = `data:image/jpeg;base64,${imageData}`;
      } else {
        img.src = imageData;
      }
    });
  }
};