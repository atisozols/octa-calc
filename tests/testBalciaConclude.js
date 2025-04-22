const { concludePolicy } = require('../utils/balcia');

const testConcludePolicy = async () => {
  try {
    const policyOfferId = await concludePolicy(
      'BJ8614',
      'AF2984030',
      3,
      '42442866753',
      'atimozolam@gmail.com',
      '+37127804609',
    );
    console.log('Saved Policy Offer ID:', policyOfferId);
  } catch (error) {
    console.error('Error:', error.message);
  }
};

testConcludePolicy();
