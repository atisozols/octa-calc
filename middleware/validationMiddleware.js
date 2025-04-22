const {
  validateAutoRequest,
  validateCheckout,
} = require('../utils/validation');

const validateAutoMiddleware = (req, res, next) => {
  const { error } = validateAutoRequest(req.body);

  if (error) {
    return res.status(400).json({
      message: error.details[0].message,
    });
  }

  next();
};

const validateCheckoutMiddleware = (req, res, next) => {
  const { error } = validateCheckout(req.body);

  if (error) {
    return res.status(400).json({
      message: error.details[0].message,
    });
  }

  next();
};

module.exports = { validateAutoMiddleware, validateCheckoutMiddleware };
