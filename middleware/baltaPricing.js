const Balta = require('../utils/balta');

const baltaPricing = async (req, res, next) => {
  const { reg, vin } = req.body;

  try {
    const pricingData = await Balta.getPricing(reg, vin);

    if (!res.data) res.data = [];
    res.data.push(pricingData);

    next();
  } catch (error) {
    // Prefix error with company name for errorHandler.js to recognize
    const baltaError = new Error(`Balta: ${error.message}`);
    next(baltaError);
  }
};

module.exports = baltaPricing;
