const express = require('express');
const router = express.Router();
const suggestionCtrl = require('../controllers/suggestionController');
const authMiddleware = require('../middleware/authMiddleware');

// Public - butuh login
router.use(authMiddleware);

// GET /api/suggestions/my - get my suggestions
router.get('/my', suggestionCtrl.getMySuggestions);

// POST /api/suggestions - create new suggestion
router.post('/', suggestionCtrl.createSuggestion);

// Admin routes
router.get('/', suggestionCtrl.getAllSuggestions);
router.put('/:id', suggestionCtrl.updateSuggestion);

module.exports = router;