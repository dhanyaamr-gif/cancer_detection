const Notification = require('../models/Notification');

/**
 * GET /api/notifications
 * Get notifications for the logged-in doctor
 */
const getNotifications = async (req, res, next) => {
  try {
    const { unreadOnly, page = 1, limit = 50 } = req.query;

    let query = { doctorId: req.doctorId };
    if (unreadOnly === 'true') {
      query.read = false;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Notification.countDocuments({ doctorId: req.doctorId }),
      Notification.countDocuments({
        doctorId: req.doctorId,
        read: false,
      }),
    ]);

    res.json({
      success: true,
      notifications: notifications.map((n) => ({
        id: n._id,
        type: n.type,
        message: n.message,
        read: n.read,
        relatedId: n.relatedId,
        relatedModel: n.relatedModel,
        createdAt: n.createdAt,
      })),
      unreadCount,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/notifications/:id/read
 * Mark a notification as read
 */
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, doctorId: req.doctorId },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.',
      });
    }

    res.json({
      success: true,
      notification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { doctorId: req.doctorId, read: false },
      { read: true }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead };

