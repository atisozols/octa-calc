// Import insurance provider modules
const balcia = require('./balcia');
const balta = require('./balta');
const ergo = require('./ergo');

/**
 * Creates a policy offer with the selected insurance provider
 * @param {string} selectedOfferId - ID of the selected insurance provider
 * @param {object} carData - Car registration data
 * @param {number} octaDuration - Duration of the policy in months
 * @returns {Promise<object>} - Object containing policyId and price
 */
const savePolicyOffer = async (selectedOfferId, carData, octaDuration) => {
  try {
    console.log(`Creating policy offer with provider: ${selectedOfferId}`);

    const { reg, vin } = carData;

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

/**
 * Approves a policy with the selected insurance provider after payment
 * @param {object} order - The order object containing policy details
 * @returns {Promise<object>} - Object containing the approved policy ID
 */
const approvePolicy = async (order) => {
  try {
    console.log(`Approving policy for order: ${order._id}`);

    const { insuranceCompany, policyId, carData, email, phone, octaDuration } =
      order;
    const { reg, vin } = carData;

    switch (insuranceCompany) {
      case 'balcia':
        const balciaResult = await balcia.concludePolicy(
          reg,
          vin,
          octaDuration,
          policyId,
          email,
          phone,
        );
        return {
          policyId: balciaResult.agreementDetails?.agreementId || policyId,
        };

      case 'balta':
        const baltaResult = await balta.concludePolicy(policyId);
        return { policyId };

      case 'ergo':
        const ergoResult = await ergo.concludePolicy(policyId);
        return { policyId: ergoResult.policyNumber || policyId };

      default:
        throw new Error(`Unknown insurance provider: ${insuranceCompany}`);
    }
  } catch (error) {
    console.error(`Error approving policy: ${error.message}`);
    throw new Error(`Failed to approve policy: ${error.message}`);
  }
};

module.exports = {
  savePolicyOffer,
  approvePolicy,
};
