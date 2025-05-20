const Balcia = require('../utils/balcia');

const balciaPricing = async (req, res, next) => {
  const { reg, vin } = req.body;

  try {
    const pricingData = await Balcia.getPricing(reg, vin);

    if (!res.data) res.data = [];
    res.data.push(pricingData);

    next();
  } catch (error) {
    // Prefix error with company name for errorHandler.js to recognize
    const balciaError = new Error(`Balcia: ${error.message}`);
    next(balciaError);
  }
};

module.exports = balciaPricing;
