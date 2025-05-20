// Import insurance provider modules
const balcia = require('./balcia');
const balta = require('./balta');
const ergo = require('./ergo');

/**
 * Creates a policy offer with the selected insurance provider
 * @param {string} selectedOfferId - ID of the selected insurance provider
 * @param {object} carData - Car registration data
 * @param {number} octaDuration - Duration of the policy in months
 * @param {string} email - Customer email
 * @param {string} phone - Customer phone number
 * @returns {Promise<object>} - Object containing policyId and price
 */
const savePolicyOffer = async (
  selectedOfferId,
  carData,
  octaDuration,
  email,
  phone,
) => {
  try {
    console.log(`Creating policy offer with provider: ${selectedOfferId}`);

    // Extract car data needed for all providers
    const { reg, vin } = carData;

    // Call the appropriate provider's savePolicy function based on selectedOfferId
    switch (selectedOfferId) {
      case 'balcia':
        return await balcia.savePolicy(reg, vin, octaDuration);

      case 'balta':
        return await balta.savePolicy(reg, vin, octaDuration);

      case 'ergo':
        return await ergo.savePolicy(reg, vin, octaDuration);

      default:
        throw new Error(`Unknown insurance provider: ${selectedOfferId}`);
    }
  } catch (error) {
    console.error(`Error creating policy offer: ${error.message}`);
    throw new Error(`Failed to create policy offer: ${error.message}`);
  }
};

const approvePolicy = async (order) => {
  return {
    success: true,
    policyId:
      order.policyId ||
      `POLICY-${Date.now()}-${order._id.toString().substring(0, 6)}`,
  };
};

module.exports = {
  savePolicyOffer,
  approvePolicy,
};
