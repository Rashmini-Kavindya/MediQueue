const express = require('express');
const router = express.Router();

const controller = require('../controllers/templateController');
const { verifyToken, roleGuard } = require('../middleware/auth');

router.use(verifyToken);
router.use(roleGuard(['admin']));

router.post('/', controller.createTemplate);

router.get('/', controller.getTemplates);

router.put('/:id', controller.updateTemplate);

router.delete('/:id', controller.deleteTemplate);

module.exports = router;