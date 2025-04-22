const Balta = require('../utils/balta');

const baltaPricing = async (req, res, next) => {
  const { reg, vin } = req.body;

  try {
    const pricingData = await Balta.getPricing(reg, vin);

    if (!res.data) res.data = [];
    res.data.push(pricingData);

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = baltaPricing;
