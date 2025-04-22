const { savePolicy } = require('../utils/balta');

const testSavePolicy = async () => {
  try {
    const policyOfferId = await savePolicy('BJ8614', 'AF2984030', 3);
    console.log('Saved Policy Offer ID:', policyOfferId);
  } catch (error) {
    console.error('Error:', error.message);
  }
};

testSavePolicy();
