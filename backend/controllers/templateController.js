const NotificationTemplate =
  require('../models/NotificationTemplate');


exports.createTemplate = async (req, res) => {
  try {
    const {
      type,
      language,
      body,
      status
    } = req.body;

    const template = new NotificationTemplate({
      type,
      language,
      body,
      status: status || 'active'
    });

    await template.save();

    res.status(201).json({
      success: true,
      data: template,
      message: 'Template created successfully'
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Template already exists for this type and language'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.getTemplates = async (req, res) => {
  try {
    const templates =
      await NotificationTemplate.find()
        .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: templates
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const template =
      await NotificationTemplate.findByIdAndUpdate(
        id,
        req.body,
        {
          new: true,
          runValidators: true
        }
      );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.status(200).json({
      success: true,
      data: template,
      message: 'Template updated successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const template =
      await NotificationTemplate.findByIdAndDelete(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};