/**
 * Generate a unique patient ID
 * Format: PT-XXXX where XXXX is alphanumeric
 */
const generatePatientId = () => {
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PT-${timestamp}${random}`;
};

/**
 * Generate a unique report number
 * Format: RP-XXXXXX
 */
const generateReportNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RP-${timestamp}${random}`;
};

/**
 * Format a date to ISO string for MongoDB
 */
const formatDate = (date) => {
  return new Date(date).toISOString();
};

/**
 * Get the full URL for a file path
 */
const getFileUrl = (req, filePath) => {
  if (!filePath) return null;
  if (filePath.startsWith('http')) return filePath;
  return `${req.protocol}://${req.get('host')}/${filePath.replace(/\\/g, '/')}`;
};

/**
 * Determine result label from prediction confidence
 */
const getResultLabel = (cancerDetected, confidence) => {
  if (cancerDetected) return 'Malignant';
  if (confidence >= 70) return 'Benign';
  return 'Under Review';
};

/**
 * Determine report status from result label
 */
const getReportStatus = (resultLabel) => {
  switch (resultLabel) {
    case 'Malignant':
      return 'Completed';
    case 'Benign':
      return 'Reviewed';
    default:
      return 'Pending';
  }
};

/**
 * Create notification message based on type
 */
const createNotificationMessage = (type, data = {}) => {
  switch (type) {
    case 'scan_uploaded':
      return `New scan uploaded for patient ${data.patientName || 'Unknown'}`;
    case 'analysis_completed':
      return `AI analysis completed for ${data.patientName || 'Unknown'} — ${data.prediction || 'results ready'}`;
    case 'cancer_detected':
      return `⚠️ Cancer detected in ${data.patientName || 'Unknown'} — ${data.cancerType || 'Unknown type'} with ${data.confidence || 0}% confidence`;
    case 'healthy_scan':
      return `✅ Healthy scan confirmed for ${data.patientName || 'Unknown'}`;
    case 'report_generated':
      return `Report ${data.reportNumber || ''} generated for ${data.patientName || 'Unknown'}`;
    default:
      return 'New notification';
  }
};

module.exports = {
  generatePatientId,
  generateReportNumber,
  formatDate,
  getFileUrl,
  getResultLabel,
  getReportStatus,
  createNotificationMessage,
};

