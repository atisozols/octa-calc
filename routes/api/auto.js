const express = require('express');

const router = express.Router();
const balciaMiddleware = require('../../middleware/balciaPricing');
const { autoController } = require('../../controllers/autoController');
const ergoMiddleware = require('../../middleware/ergoPricing');
const baltaMiddleware = require('../../middleware/baltaPricing');
const {
  validateAutoMiddleware,
} = require('../../middleware/validationMiddleware');

router.post(
  '/',
  validateAutoMiddleware,
  balciaMiddleware,
  ergoMiddleware,
  baltaMiddleware,
  autoController,
);
router.post('/ergo', validateAutoMiddleware, ergoMiddleware, autoController);
router.post('/balta', validateAutoMiddleware, baltaMiddleware, autoController);
router.post(
  '/balcia',
  validateAutoMiddleware,
  balciaMiddleware,
  autoController,
);

module.exports = router;
