const AlertPreference = require('../models/AlertPreference');
const User = require('../models/User');

const LANGUAGES = ['si', 'en', 'ta'];
const CHANNELS = ['app', 'sms'];

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getPaging = (query, defaultLimit = 20) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

// GET /api/admin/alert-preferences?language=&channel=&search=&page=&limit=
exports.listPreferences = async (req, res) => {
  try {
    const { language, channel, search } = req.query;
    const { page, limit, skip } = getPaging(req.query);

    const filter = {};
    if (language) filter.language = language;
    if (channel) filter.channels = channel; // matches arrays that contain the channel
    if (search) filter.userId = new RegExp(escapeRegex(search), 'i');

    const [preferences, total, summaryRows] = await Promise.all([
      AlertPreference.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      AlertPreference.countDocuments(filter),
      AlertPreference.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            smsEnabled: {
              $sum: { $cond: [{ $in: ['sms', { $ifNull: ['$channels', []] }] }, 1, 0] }
            }
          }
        }
      ])
    ]);

    // Attach the user's name / role (never phone or email) so the admin knows who it is
    const users = await User.find({ userId: { $in: preferences.map((p) => p.userId) } })
      .select('userId name firstName lastName role')
      .lean();
    const byId = new Map(users.map((u) => [u.userId, u]));

    const data = preferences.map((p) => {
      const u = byId.get(p.userId);
      return {
        ...p,
        user: u
          ? {
              name: u.name || [u.firstName, u.lastName].filter(Boolean).join(' ') || null,
              role: u.role || null
            }
          : null
      };
    });

    const summary = summaryRows[0] || { total: 0, smsEnabled: 0 };

    res.status(200).json({
      success: true,
      data,
      summary: { total: summary.total, smsEnabled: summary.smsEnabled },
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/alert-preferences/:id   (:id = userId)
exports.getPreference = async (req, res) => {
  try {
    const preference = await AlertPreference.findOne({ userId: req.params.id });

    if (!preference) {
      return res.status(404).json({ success: false, message: 'Alert preference not found' });
    }

    res.status(200).json({ success: true, data: preference });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/admin/alert-preferences/:id   body: { threshold?, channels?, language? }
exports.updatePreference = async (req, res) => {
  try {
    const preference = await AlertPreference.findOne({ userId: req.params.id });

    if (!preference) {
      return res.status(404).json({ success: false, message: 'Alert preference not found' });
    }

    const { threshold, channels, language } = req.body;

    if (threshold !== undefined) {
      const value = Number(threshold);
      if (!Number.isInteger(value) || value < 1) {
        return res.status(400).json({ success: false, message: 'Threshold must be a whole number of 1 or more' });
      }
      preference.threshold = value;
    }

    if (channels !== undefined) {
      if (!Array.isArray(channels) || channels.some((c) => !CHANNELS.includes(c))) {
        return res.status(400).json({ success: false, message: `Channels must be any of: ${CHANNELS.join(', ')}` });
      }
      preference.channels = [...new Set(channels)];
    }

    if (language !== undefined) {
      if (!LANGUAGES.includes(language)) {
        return res.status(400).json({ success: false, message: `Language must be one of: ${LANGUAGES.join(', ')}` });
      }
      preference.language = language;
    }

    await preference.save();

    res.status(200).json({
      success: true,
      data: preference,
      message: 'Alert preference updated successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/admin/alert-preferences/:id
// Removes the saved record. The user gets default settings (5, app, en) recreated on next use.
exports.deletePreference = async (req, res) => {
  try {
    const preference = await AlertPreference.findOneAndDelete({ userId: req.params.id });

    if (!preference) {
      return res.status(404).json({ success: false, message: 'Alert preference not found' });
    }

    res.status(200).json({ success: true, message: 'Alert preference reset to defaults' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};