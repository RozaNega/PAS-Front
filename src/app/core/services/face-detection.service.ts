import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface FaceDetectionResult {
  hasFace: boolean;
  confidence: number;
  faceCount: number;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FaceDetectionService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private faceDetector: any = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  private async initializeFaceDetection(): Promise<void> {
    if (!this.isBrowser) {
      return;
    }

    if (this.isInitialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && 'FaceDetector' in window) {
        this.faceDetector = new (window as any).FaceDetector({
          maxDetectedFaces: 10,
          fastMode: false
        });
        this.isInitialized = true;
        console.log('Face Detection API initialized');
      } else {
        console.warn('Face Detection API not available, falling back to alternative method');
        // We'll use a canvas-based approach as fallback
        this.isInitialized = true;
      }
    } catch (error) {
      console.error('Failed to initialize face detection:', error);
      this.isInitialized = true; // Still mark as initialized to allow fallback
    }
  }

  /**
   * Detect faces in an uploaded image file
   */
  async detectFacesInFile(file: File): Promise<FaceDetectionResult> {
    if (!this.isBrowser) {
      return { hasFace: true, confidence: 1, faceCount: 1 };
    }

    await this.initializeFaceDetection();

    try {
      // Create image element from file
      const imageUrl = URL.createObjectURL(file);
      const img = new Image();
      
      return new Promise((resolve) => {
        img.onload = async () => {
          try {
            const result = await this.detectFacesInImage(img);
            URL.revokeObjectURL(imageUrl);
            resolve(result);
          } catch (error) {
            URL.revokeObjectURL(imageUrl);
            resolve({
              hasFace: false,
              confidence: 0,
              faceCount: 0,
              error: error instanceof Error ? error.message : 'Face detection failed'
            });
          }
        };

        img.onerror = () => {
          URL.revokeObjectURL(imageUrl);
          resolve({
            hasFace: false,
            confidence: 0,
            faceCount: 0,
            error: 'Failed to load image'
          });
        };

        img.src = imageUrl;
      });
    } catch (error) {
      return {
        hasFace: false,
        confidence: 0,
        faceCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Detect faces in an image element
   */
  private async detectFacesInImage(img: HTMLImageElement): Promise<FaceDetectionResult> {
    try {
      // Try native Face Detection API first
      if (this.faceDetector && typeof window !== 'undefined' && 'FaceDetector' in window) {
        const faces = await this.faceDetector.detect(img);
        return {
          hasFace: faces.length > 0,
          confidence: faces.length > 0 ? 0.8 : 0, // Native API doesn't provide confidence
          faceCount: faces.length
        };
      }

      // Fallback to canvas-based detection
      return await this.canvasBasedFaceDetection(img);
    } catch (error) {
      console.error('Face detection error:', error);
      // If all else fails, use basic image analysis
      return await this.basicImageAnalysis(img);
    }
  }

  /**
   * Canvas-based face detection using basic image analysis
   */
  private async canvasBasedFaceDetection(img: HTMLImageElement): Promise<FaceDetectionResult> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Canvas context not available');
    }

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const analysis = this.analyzeImageForFace(imageData);
      
      return {
        hasFace: analysis.likelyHasFace,
        confidence: analysis.confidence,
        faceCount: analysis.likelyHasFace ? 1 : 0
      };
    } catch (error) {
      throw new Error('Failed to analyze image data');
    }
  }

  /**
   * Basic image analysis to detect if image likely contains a face
   */
  private analyzeImageForFace(imageData: ImageData): { likelyHasFace: boolean; confidence: number } {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Analyze core area (60% of center)
    const scanWidth = Math.floor(width * 0.6);
    const scanHeight = Math.floor(height * 0.6);
    const startX = Math.floor(width * 0.2);
    const startY = Math.floor(height * 0.2);
    
    // 3x3 Grid Analysis
    const gridRows = 3;
    const gridCols = 3;
    const cellWidth = Math.floor(scanWidth / gridCols);
    const cellHeight = Math.floor(scanHeight / gridRows);
    const gridDensities = Array(gridRows).fill(0).map(() => Array(gridCols).fill(0));
    
    let totalSkinPixels = 0;
    let totalPixels = scanWidth * scanHeight;

    // Use the core scanning logic from components
    for (let y = 0; y < scanHeight; y++) {
      for (let x = 0; x < scanWidth; x++) {
        // Calculate offset in original data array
        const origX = startX + x;
        const origY = startY + y;
        const i = (origY * width + origX) * 4;
        
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (this.isSkinColor(r, g, b)) {
          totalSkinPixels++;
          const row = Math.min(Math.floor(y / cellHeight), gridRows - 1);
          const col = Math.min(Math.floor(x / cellWidth), gridCols - 1);
          gridDensities[row][col]++;
        }
      }
    }

    const overallRatio = totalSkinPixels / totalPixels;

    // Convert counts to densities
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        gridDensities[r][c] = gridDensities[r][c] / (cellWidth * cellHeight);
      }
    }

    // FACE & FULL-BODY STRUCTURAL RULES:
    const centerColAvg = (gridDensities[0][1] + gridDensities[1][1] + gridDensities[2][1]) / 3;
    const leftColAvg = (gridDensities[0][0] + gridDensities[1][0] + gridDensities[2][0]) / 3;
    const rightColAvg = (gridDensities[0][2] + gridDensities[1][2] + gridDensities[2][2]) / 3;

    // A real person (face or body) is vertically oriented and centered
    const isVerticalDominant = centerColAvg > (leftColAvg * 1.2) && centerColAvg > (rightColAvg * 1.2);
    
    // Face-specific: center area is very dense
    const isFaceCore = gridDensities[1][1] > 0.40 && gridDensities[0][1] > 0.30;
    
    // Full-Body specific: vertical column is consistent but maybe less dense than a close-up face
    const isFullBodyStrip = centerColAvg > 0.15 && gridDensities[0][1] > 0.10 && gridDensities[2][1] > 0.10;
    
    const isRatioValid = overallRatio > 0.10 && overallRatio < 0.85;

    // Check for pixel color variance (Human skin isn't a perfectly flat color)
    const hasVariance = this.checkSkinVariance(data, width, height, startX, startY, scanWidth, scanHeight);

    const likelyHasFace = isVerticalDominant && (isFaceCore || isFullBodyStrip) && isRatioValid && hasVariance;
    
    // Calculate confidence based on how many rules were passed
    let score = 0;
    if (isVerticalDominant) score += 0.3;
    if (isFaceCore) score += 0.3;
    else if (isFullBodyStrip) score += 0.2;
    if (isRatioValid) score += 0.2;
    if (hasVariance) score += 0.2;

    return { likelyHasFace, confidence: score };
  }

  /**
   * Check for pixel color variance in skin-tone areas
   */
  private checkSkinVariance(
    data: Uint8ClampedArray, 
    width: number, 
    height: number,
    startX: number,
    startY: number,
    scanWidth: number,
    scanHeight: number
  ): boolean {
    let sumR = 0, count = 0;
    
    // Sample core area
    for (let y = 0; y < scanHeight; y += 10) {
      for (let x = 0; x < scanWidth; x += 10) {
        const origX = startX + x;
        const origY = startY + y;
        const i = (origY * width + origX) * 4;
        
        if (this.isSkinColor(data[i], data[i+1], data[i+2])) {
          sumR += data[i];
          count++;
        }
      }
    }
    
    if (count < 50) return false;

    const avgR = sumR / count;
    let varianceR = 0;
    
    for (let y = 0; y < scanHeight; y += 10) {
      for (let x = 0; x < scanWidth; x += 10) {
        const origX = startX + x;
        const origY = startY + y;
        const i = (origY * width + origX) * 4;
        
        if (this.isSkinColor(data[i], data[i+1], data[i+2])) {
          varianceR += Math.abs(data[i] - avgR);
        }
      }
    }
    
    const avgVariance = varianceR / count;
    // Human skin has subtle texture. Flat objects like paper/boxes have very low variance (< 3)
    return avgVariance > 4.0;
  }

  /**
   * Check if RGB values represent skin color (YCbCr Color Space)
   */
  private isSkinColor(r: number, g: number, b: number): boolean {
    // Basic RGB check
    const basicCheck = (
      r > 95 && g > 40 && b > 20 &&
      r > g && r > b &&
      Math.abs(r - g) > 15 &&
      r - b > 15
    );

    if (basicCheck) return true;

    // YCbCr Color Space Skin Detection
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    
    // Cr/Cb bounds for human skin
    return cr >= 133 && cr <= 173 && cb >= 77 && cb <= 127;
  }

  /**
   * Simple edge detection
   */
  private isEdgePixel(data: Uint8ClampedArray, index: number, width: number): boolean {
    const pixelsPerRow = width * 4;
    
    // Check if we can compare with adjacent pixels
    if (index < pixelsPerRow || index >= data.length - pixelsPerRow) {
      return false;
    }
    
    const current = data[index] + data[index + 1] + data[index + 2];
    const above = data[index - pixelsPerRow] + data[index - pixelsPerRow + 1] + data[index - pixelsPerRow + 2];
    const below = data[index + pixelsPerRow] + data[index + pixelsPerRow + 1] + data[index + pixelsPerRow + 2];
    
    return Math.abs(current - above) > 100 || Math.abs(current - below) > 100;
  }

  /**
   * Basic image analysis fallback
   */
  private async basicImageAnalysis(img: HTMLImageElement): Promise<FaceDetectionResult> {
    // Very basic check - if image is too small or too large, likely not a face photo
    const aspectRatio = img.width / img.height;
    const isReasonableSize = img.width >= 100 && img.height >= 100 && img.width <= 4000 && img.height <= 4000;
    const isReasonableAspectRatio = aspectRatio > 0.5 && aspectRatio < 2.0;
    
    const confidence = (isReasonableSize && isReasonableAspectRatio) ? 0.3 : 0.1;
    
    return {
      hasFace: isReasonableSize && isReasonableAspectRatio,
      confidence,
      faceCount: (isReasonableSize && isReasonableAspectRatio) ? 1 : 0
    };
  }

  /**
   * Validate if uploaded file is a valid profile photo
   */
  async validateProfilePhoto(file: File): Promise<{ valid: boolean; message: string; confidence?: number }> {
    if (!this.isBrowser) {
      return { valid: true, message: 'Valid profile photo detected.', confidence: 1 };
    }

    if (!file.type.startsWith('image/')) {
      return { valid: false, message: 'Please upload an image file.' };
    }

    // Increase file size limit (e.g. 20MB)
    if (file.size > 20 * 1024 * 1024) {
      return { valid: false, message: 'Image file is too large. Maximum size is 20MB.' };
    }

    try {
      const result = await this.detectFacesInFile(file);
      
      if (result.error) {
        return { valid: false, message: `Error analyzing image: ${result.error}` };
      }

      if (!result.hasFace) {
        return { 
          valid: false, 
          message: 'No face detected in the image. Please upload a clear photo of yourself.',
          confidence: result.confidence
        };
      }

      if (result.faceCount > 3) {
        return { 
          valid: false, 
          message: 'Multiple faces detected. Please upload a photo with only yourself.',
          confidence: result.confidence
        };
      }

      return { 
        valid: true, 
        message: 'Valid profile photo detected.',
        confidence: result.confidence
      };
    } catch (error) {
      return { 
        valid: false, 
        message: 'Failed to analyze image. Please try a different photo.' 
      };
    }
  }
}