const express = require('express');
const {
  processCallback,
  createPayment,
} = require('../../controllers/paymentsController');
const {
  validateCheckoutMiddleware,
} = require('../../middleware/validationMiddleware');

const router = express.Router();

router.post('/create', validateCheckoutMiddleware, createPayment);

router.get('/callback', processCallback);

module.exports = router;
