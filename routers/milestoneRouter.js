const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/milestoneController');
const auth = require('../middleware/authMiddleware');

router.get('/',                    auth, ctrl.getMilestones);
router.put('/',                    auth, ctrl.upsertMilestones);
router.get('/public/:username',    ctrl.getPublicMilestones);

module.exports = router;