const express = require('express');
const router = express.Router();
const { analyzeResume, generateCoverLetter } = require('../controllers/aiController');

router.post('/analyze', analyzeResume);
router.post('/cover-letter', generateCoverLetter);

module.exports = router;
