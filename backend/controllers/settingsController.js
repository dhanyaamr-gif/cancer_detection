const Settings = require('../models/Settings');

/**
 * GET /api/settings
 * Get settings for the logged-in doctor
 */
const getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne({ doctorId: req.doctorId });

    // Create default settings if not exist
    if (!settings) {
      settings = await Settings.create({ doctorId: req.doctorId });
    }

    res.json({
      success: true,
      settings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/settings
 * Update settings for the logged-in doctor
 */
const updateSettings = async (req, res, next) => {
  try {
    const allowedFields = [
      'emailNotifications',
      'criticalAlerts',
      'reportReadyNotifications',
      'autoSaveReports',
      'showExplainableAi',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const settings = await Settings.findOneAndUpdate(
      { doctorId: req.doctorId },
      updates,
      { new: true, upsert: true, runValidators: true }
    );

    res.json({
      success: true,
      settings,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSettings, updateSettings };

