const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');
const multer = require('multer');
const path = require('path');
const uploadDir = path.join(__dirname, '../uploads');
const upload = multer({ dest: uploadDir });


router.get('/campaigns', dataController.getCampaigns);
router.get('/campaigns/:id', dataController.getCampaignById);
router.put('/campaigns/:id', dataController.updateCampaign);
router.get('/campaigns/:id/creatives', dataController.getCampaignCreatives);
router.post('/campaigns/:id/creatives', upload.single('image'), dataController.uploadCreative);

module.exports = router;
