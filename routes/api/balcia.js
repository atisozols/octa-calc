const express = require('express');

const router = express.Router();
const balciaController = require('../../controllers/balciaController');

router.route('/').post(balciaController.getPricing);

module.exports = router;
