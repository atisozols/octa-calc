const auto = require('../utils/ergo');

const ergoMiddleware = async (req, res, next) => {
  try {
    const { reg, vin } = req.body;

    const pricingData = await auto(reg, vin);

    if (!res.data) {
      res.data = [];
    }

    res.data.push(pricingData);
    next();
  } catch (error) {
    res
      .status(500)
      .send({ message: `Get pricing for ERGO failed: ${error.message}` });
  }
};

module.exports = ergoMiddleware;
