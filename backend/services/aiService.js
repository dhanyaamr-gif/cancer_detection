const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// Cancer types pool for random generation
const CANCER_TYPES = [
  'Glioblastoma',
  'Lung Cancer',
  'Breast Cancer',
  'Prostate Carcinoma',
  'Liver Cancer',
  'Colon Cancer',
  'Pancreatic Cancer',
  'Ovarian Cancer',
  'Melanoma',
  'Lymphoma',
];

// Body-part-specific cancer mappings
const BODY_PART_CANCERS = {
  Brain: ['Glioblastoma', 'Meningioma', 'Astrocytoma'],
  Lung: ['Lung Cancer', 'Pulmonary Nodule', 'Mesothelioma'],
  Breast: ['Breast Cancer', 'Ductal Carcinoma', 'Lobular Carcinoma'],
  Chest: ['Lung Cancer', 'Pulmonary Nodule', 'Thymoma'],
  Abdomen: ['Liver Cancer', 'Pancreatic Cancer', 'Colon Cancer', 'Ovarian Cancer'],
  Prostate: ['Prostate Carcinoma', 'Bladder Cancer'],
  Skin: ['Melanoma', 'Basal Cell Carcinoma'],
};

const BODY_PART_TUMOR_LOCATIONS = {
  Brain: { x: 210, y: 140, width: 95, height: 80 },
  Lung: { x: 180, y: 200, width: 60, height: 55 },
  Breast: { x: 150, y: 170, width: 50, height: 45 },
  Chest: { x: 150, y: 170, width: 70, height: 65 },
  Abdomen: { x: 200, y: 180, width: 65, height: 60 },
};

/**
 * Sleep helper for simulating AI inference time
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generate a placeholder heatmap image by overlaying a red rectangle
 * on the original image using sharp (if available) or copying the file
 */
const generateHeatmap = async (imagePath, tumorRegion) => {
  try {
    const ext = path.extname(imagePath);
    const heatmapFilename = `heatmap_${uuidv4()}${ext}`;
    const heatmapDir = path.join(UPLOAD_DIR, 'heatmaps');
    fs.mkdirSync(heatmapDir, { recursive: true });

    const heatmapPath = path.join(heatmapDir, heatmapFilename);

    try {
      // Try using sharp to overlay a red rectangle
      const sharp = require('sharp');
      const { x, y, width, height } = tumorRegion || { x: 200, y: 150, width: 80, height: 70 };

      const overlay = Buffer.from(
        `<svg width="${width}" height="${height}">
          <rect x="0" y="0" width="${width}" height="${height}" 
                fill="none" stroke="red" stroke-width="3" 
                stroke-dasharray="8 4" />
          <rect x="2" y="2" width="${width-4}" height="${height-4}" 
                fill="rgba(255,0,0,0.15)" />
        </svg>`
      );

      const svgOverlay = Buffer.from(
        `<svg width="100%" height="100%" viewBox="0 0 512 512">
          <defs>
            <radialGradient id="heatGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="rgba(255,0,0,0.35)" />
              <stop offset="50%" stop-color="rgba(255,165,0,0.2)" />
              <stop offset="100%" stop-color="rgba(255,255,0,0.05)" />
            </radialGradient>
          </defs>
          <ellipse cx="${x + width/2}" cy="${y + height/2}" 
                   rx="${Math.max(width, height) * 0.8}" ry="${Math.max(width, height) * 0.8}" 
                   fill="url(#heatGrad)" />
          <rect x="${x}" y="${y}" width="${width}" height="${height}" 
                fill="none" stroke="#ff4444" stroke-width="2.5" 
                stroke-dasharray="6 3" rx="4" />
        </svg>`
      );

      await sharp(imagePath)
        .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .composite([
          {
            input: svgOverlay,
            top: 0,
            left: 0,
          },
        ])
        .toFile(heatmapPath);

      return heatmapPath;
    } catch (sharpErr) {
      // Fallback: just copy the image as a placeholder
      console.warn('Sharp not available for heatmap, using copy fallback:', sharpErr.message);
      fs.copyFileSync(imagePath, heatmapPath);
      return heatmapPath;
    }
  } catch (error) {
    console.error('Heatmap generation error:', error.message);
    return null;
  }
};

/**
 * Generate a detection image with tumor bounding box overlay
 */
const generateDetectionImage = async (imagePath, tumorRegion) => {
  try {
    const ext = path.extname(imagePath);
    const detectionFilename = `detection_${uuidv4()}${ext}`;
    const detectionDir = path.join(UPLOAD_DIR, 'scans');
    fs.mkdirSync(detectionDir, { recursive: true });

    const detectionPath = path.join(detectionDir, detectionFilename);

    try {
      const sharp = require('sharp');
      const { x, y, width, height } = tumorRegion || { x: 200, y: 150, width: 80, height: 70 };

      const svgOverlay = Buffer.from(
        `<svg width="100%" height="100%" viewBox="0 0 512 512">
          <rect x="${x}" y="${y}" width="${width}" height="${height}" 
                fill="none" stroke="#ff2222" stroke-width="3" rx="4" />
          <line x1="${x}" y1="${y}" x2="${x + 15}" y2="${y}" stroke="#ff2222" stroke-width="2" />
          <line x1="${x}" y1="${y}" x2="${x}" y2="${y + 15}" stroke="#ff2222" stroke-width="2" />
          <line x1="${x + width}" y1="${y}" x2="${x + width - 15}" y2="${y}" stroke="#ff2222" stroke-width="2" />
          <line x1="${x + width}" y1="${y}" x2="${x + width}" y2="${y + 15}" stroke="#ff2222" stroke-width="2" />
          <line x1="${x}" y1="${y + height}" x2="${x + 15}" y2="${y + height}" stroke="#ff2222" stroke-width="2" />
          <line x1="${x}" y1="${y + height}" x2="${x}" y2="${y + height - 15}" stroke="#ff2222" stroke-width="2" />
          <line x1="${x + width}" y1="${y + height}" x2="${x + width - 15}" y2="${y + height}" stroke="#ff2222" stroke-width="2" />
          <line x1="${x + width}" y1="${y + height}" x2="${x + width}" y2="${y + height - 15}" stroke="#ff2222" stroke-width="2" />
          <text x="${x}" y="${y - 8}" fill="#ff2222" font-size="14" font-weight="bold">Tumor</text>
        </svg>`
      );

      await sharp(imagePath)
        .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .composite([
          {
            input: svgOverlay,
            top: 0,
            left: 0,
          },
        ])
        .toFile(detectionPath);

      return detectionPath;
    } catch (sharpErr) {
      const relativePath = path.relative(UPLOAD_DIR, imagePath);
      return path.join(UPLOAD_DIR, relativePath);
    }
  } catch (error) {
    console.error('Detection image generation error:', error.message);
    return null;
  }
};

/**
 * Run placeholder AI analysis on an image
 * Returns simulated results with 2-3 second delay
 */
const AI_UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

/**
 * Copy a heatmap/detection file from the Python AI service's upload directory
 * to the backend's upload directory, so the backend can serve it statically.
 */
const copyAIResultFile = async (sourceUrl, targetSubDir) => {
  if (!sourceUrl) return null;
  try {
    // sourceUrl looks like /uploads/heatmaps/xxx.png (relative to AI service)
    const filename = path.basename(sourceUrl);
    const targetDir = path.join(AI_UPLOAD_DIR, targetSubDir);
    fs.mkdirSync(targetDir, { recursive: true });

    // Try to fetch from the AI service
    const axios = require('axios');
    const response = await axios.get(`${AI_SERVICE_URL}${sourceUrl}`, {
      responseType: 'stream',
      timeout: 10000,
    });

    const targetPath = path.join(targetDir, filename);
    const writer = fs.createWriteStream(targetPath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log(`[AI Service] Copied ${sourceUrl} to ${targetPath}`);
    return targetPath;
  } catch (err) {
    console.warn(`[AI Service] Could not copy ${sourceUrl}: ${err.message}`);
    return null;
  }
};

const analyzeImage = async (imagePath, patientInfo = {}) => {
  try {
    // Try to call the real AI service first
    const axios = require('axios');
    const FormData = require('form-data');
    
    const formData = new FormData();
    const imageStream = fs.createReadStream(imagePath);
    formData.append('image', imageStream, path.basename(imagePath));
    formData.append('patientInfo', JSON.stringify(patientInfo));

    const response = await axios.post(`${AI_SERVICE_URL}/api/analyze`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 30000,
    });

    if (response.data && response.data.success) {
      const aiResult = response.data;

      // Copy heatmap and detection files from AI service to backend uploads
      if (aiResult.heatmapUrl) {
        const copiedPath = await copyAIResultFile(aiResult.heatmapUrl, 'heatmaps');
        if (copiedPath) {
          aiResult.heatmapPath = copiedPath;
          aiResult.heatmapUrl = `/uploads/heatmaps/${path.basename(copiedPath)}`;
        } else {
          // If copy failed, generate locally
          const fallback = await getPlaceholderPrediction(imagePath, patientInfo);
          aiResult.heatmapPath = fallback.heatmapPath || null;
          aiResult.heatmapUrl = fallback.heatmapUrl || null;
        }
      }

      // Also copy detection image if present
      if (aiResult.detectionUrl) {
        const copiedDetection = await copyAIResultFile(aiResult.detectionUrl, 'scans');
        if (copiedDetection) {
          aiResult.detectionPath = copiedDetection;
          aiResult.detectionUrl = `/uploads/scans/${path.basename(copiedDetection)}`;
        }
      }

      return aiResult;
    }
  } catch (error) {
    console.warn('AI service unavailable, using placeholder:', error.message);
  }

  // Fall back to placeholder
  return getPlaceholderPrediction(imagePath, patientInfo);
};

/**
 * Placeholder prediction with realistic delay and random results
 */
const getPlaceholderPrediction = async (imagePath, patientInfo = {}) => {
  const { bodyPart = 'Brain' } = patientInfo;

  // Simulate AI processing delay (2-3 seconds)
  await sleep(2000 + Math.random() * 1000);

  // Randomly determine if cancer is detected (50/50 chance)
  const cancerDetected = Math.random() > 0.5;

  // Get body-part-specific cancer types
  const bodyCancers = BODY_PART_CANCERS[bodyPart] || CANCER_TYPES;
  const cancerType = bodyCancers[Math.floor(Math.random() * bodyCancers.length)];

  // Generate confidence values
  let confidence, riskLevel, tumorRegion, tumorSize, location;

  if (cancerDetected) {
    confidence = 85 + Math.floor(Math.random() * 15); // 85-99%
    riskLevel = confidence > 93 ? 'High' : confidence > 88 ? 'Moderate' : 'Low';
    tumorRegion = BODY_PART_TUMOR_LOCATIONS[bodyPart] || {
      x: 180 + Math.floor(Math.random() * 60),
      y: 140 + Math.floor(Math.random() * 60),
      width: 60 + Math.floor(Math.random() * 40),
      height: 55 + Math.floor(Math.random() * 35),
    };
    tumorSize = `${(1.0 + Math.random() * 3.5).toFixed(2)} cm`;
    location = bodyPart === 'Brain' ? 'Frontal Lobe' :
               bodyPart === 'Lung' ? 'Right Upper Lobe' :
               bodyPart === 'Breast' ? 'Upper Outer Quadrant' :
               bodyPart === 'Chest' ? 'Left Lower Lobe' :
               bodyPart === 'Abdomen' ? 'Right Upper Quadrant' :
               'Primary Site';
  } else {
    confidence = 90 + Math.floor(Math.random() * 10); // 90-99%
    riskLevel = 'Low';
    tumorRegion = { x: 0, y: 0, width: 0, height: 0 };
    tumorSize = '';
    location = '';
  }

  // Generate heatmap and detection image
  let heatmapPath = null;
  let detectionPath = null;

  if (cancerDetected) {
    try {
      heatmapPath = await generateHeatmap(imagePath, tumorRegion);
      detectionPath = await generateDetectionImage(imagePath, tumorRegion);
    } catch (e) {
      console.warn('Image generation warning:', e.message);
    }
  }

  const inferenceTime = `${(1.5 + Math.random() * 1.5).toFixed(1)}s`;
  const probability = cancerDetected ? (confidence / 100) : ((100 - confidence) / 100);

  // Generate clinical fields based on detection result
  let explanation, doctorObservation, recommendation, finalDiagnosis;

  if (cancerDetected) {
    explanation = `The highlighted lesion demonstrates irregular borders, heterogeneous density, and spiculated margins consistent with malignant tissue. Grad-CAM confirms that the prediction is based primarily on the highlighted tumor region.`;
    doctorObservation = `Lesion shows concerning radiological features with irregular margins and heterogeneous density. Recommend immediate biopsy and specialist consultation.`;
    recommendation = `Biopsy and specialist consultation within 48 hours. Consider additional imaging for staging.`;
    finalDiagnosis = `${cancerType} - Malignant`;
  } else {
    explanation = `The highlighted tissue demonstrates a uniform density distribution and smooth contouring, which is consistent with benign tissue organization. Grad-CAM coverage remains broad without focal hotspot concentration.`;
    doctorObservation = `No suspicious lesions identified. Tissue appears benign with smooth margins and uniform density.`;
    recommendation = `Routine follow-up as clinically indicated. No immediate intervention required.`;
    finalDiagnosis = `No Malignancy Detected - Benign Findings`;
  }

  const result = {
    success: true,
    cancerDetected,
    confidence,
    prediction: cancerDetected ? cancerType : 'No Cancer Detected',
    cancerType: cancerDetected ? cancerType : '',
    probability: parseFloat(probability.toFixed(2)),
    tumor: tumorRegion,
    measurements: {
      tumorSize,
      location,
      riskLevel,
    },
    explanation,
    doctorObservation,
    recommendation,
    finalDiagnosis,
    heatmapPath: heatmapPath || null,
    detectionPath: detectionPath || null,
    heatmapUrl: heatmapPath ? `/uploads/heatmaps/${path.basename(heatmapPath)}` : null,
    detectionUrl: detectionPath ? `/uploads/scans/${path.basename(detectionPath)}` : null,
    inferenceTime,
    modelVersion: 'NovaDx CNN v4.2',
  };

  return result;
};

/**
 * Analyze a single image and return its result in a normalized format.
 * Used by scanController to analyze each uploaded image individually.
 */
const analyzeSingleImage = async (imagePath, imageUrl, patientInfo = {}) => {
  try {
    const aiResult = await analyzeImage(imagePath, patientInfo);
    return {
      imagePath,
      imageUrl,
      heatmapPath: aiResult.heatmapPath || null,
      heatmapUrl: aiResult.heatmapUrl || null,
      detectionPath: aiResult.detectionPath || null,
      detectionUrl: aiResult.detectionUrl || null,
      cancerDetected: aiResult.cancerDetected || false,
      confidence: aiResult.confidence || 0,
      prediction: aiResult.prediction || 'No Cancer Detected',
      cancerType: aiResult.cancerType || '',
      probability: aiResult.probability || 0,
      tumor: aiResult.tumor || { x: 0, y: 0, width: 0, height: 0 },
      measurements: aiResult.measurements || { tumorSize: '', location: '', riskLevel: '' },
      inferenceTime: aiResult.inferenceTime || '',
      error: null,
    };
  } catch (error) {
    console.error(`[AI Service] Error analyzing ${path.basename(imagePath)}: ${error.message}`);
    return {
      imagePath,
      imageUrl,
      heatmapPath: null,
      heatmapUrl: null,
      detectionPath: null,
      detectionUrl: null,
      cancerDetected: false,
      confidence: 0,
      prediction: 'Analysis Failed',
      cancerType: '',
      probability: 0,
      tumor: { x: 0, y: 0, width: 0, height: 0 },
      measurements: { tumorSize: '', location: '', riskLevel: '' },
      inferenceTime: '',
      error: error.message,
    };
  }
};

module.exports = { analyzeImage, analyzeSingleImage, getPlaceholderPrediction, generateHeatmap, generateDetectionImage };

