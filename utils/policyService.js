const createPolicyOffer = async (
  selectedOfferId,
  carData,
  octaDuration,
  email,
  phone,
) => {
  return { policyId: '123', price: 100 };
};

const approvePolicy = async (order) => {
  return { success: true };
};

module.exports = {
  createPolicyOffer,
  approvePolicy,
};
