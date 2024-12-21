const { auto } = require('../utils/balcia');

const getPricing = async (req, res) => {
  try {
    const { vehicleRegistrationNumber, regCertNr } = req.body;
    res.status(200).send(await auto(vehicleRegistrationNumber, regCertNr));
  } catch (error) {
    res
      .status(500)
      .send({ message: `Get pricing for Balcia failed: ${error.message} ` });
  }
};

module.exports = { getPricing };
