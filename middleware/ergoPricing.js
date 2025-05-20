const Ergo = require('../utils/ergo');

const ergoPricing = async (req, res, next) => {
  const { reg, vin } = req.body;

  try {
    const pricingData = await Ergo.getPricing(reg, vin);
    if (!res.data) res.data = [];
    res.data.push(pricingData);
    next();
  } catch (error) {
    // Prefix error with company name for errorHandler.js to recognize
    const ergoError = new Error(`ERGO: ${error.message}`);
    next(ergoError);
  }
};

module.exports = ergoPricing;
