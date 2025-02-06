const express = require('express');

const router = express.Router();
const balciaMiddleware = require('../../middleware/balciaMiddleware');
const { autoController } = require('../../controllers/autoController');
const ergoMiddleware = require('../../middleware/ergoMiddleware');

router.route('/').post(balciaMiddleware, ergoMiddleware, autoController);
// router.route('/').post(ergoMiddleware, autoController);

module.exports = router;
