const axios = require('axios');
require('dotenv').config();

/**
 * Retrieves an authentication token from Balcia.
 * @returns {Promise<string>} - Authentication token.
 */
const getToken = async () => {
  try {
    const response = await axios.post(`${process.env.BALCIA_URL}/auth`, {
      username: process.env.BALCIA_USER,
      password: process.env.BALCIA_PASSWORD,
    });

    if (!response.data.token) {
      throw new Error('Token not received');
    }

    return response.data.token;
  } catch (error) {
    throw new Error(`${error.response?.statusText || error.message}`);
  }
};

/**
 * Formats Balcia's pricing response into a structured object.
 * @param {object} data - Raw response from Balcia.
 * @returns {object} - Formatted pricing response.
 */
const formatResponse = (data) => {
  if (!data.premiumDataList || !Array.isArray(data.premiumDataList)) {
    throw new Error('No valid pricing data available.');
  }

  const prices = data.premiumDataList.reduce((acc, price) => {
    const term = parseInt(price.periodDuration);
    const premium = parseFloat(price.premiumCalculated);

    if (!isNaN(term) && !isNaN(premium)) {
      acc[term] = premium;
    }

    return acc;
  }, {});

  return { id: 'balcia', logo: '/balcia.png', prices };
};

/**
 * Retrieves insurance pricing from Balcia.
 * @param {string} vehicleRegistrationNumber - Car registration number.
 * @param {string} regCertNr - Registration document number.
 * @returns {Promise<object>} - Insurance price data.
 */
const getPricing = async (vehicleRegistrationNumber, regCertNr) => {
  const token = await getToken();
  if (!token) {
    throw new Error('Token not acquired while getting pricing');
  }

  try {
    const response = await axios.post(
      `${process.env.BALCIA_URL}/auto`,
      {
        approve: false,
        save: false,
        agreementDetails: {
          branch: 'LV',
          agrType: 'TL05',
          agrLanguage: 'LV',
          paymentCountIc: 'M1',
          periodIc: '1MON',
          isLVRpack: true,
          policyType: 'DEFAULT',
        },
        vehicle: {
          vehicleRegistrationNumber,
          regCertNr,
        },
        premiumRequests: [
          { requestType: 'TlPremiumRequest', periodIc: '1MON' },
          { requestType: 'TlPremiumRequest', periodIc: '3MON' },
          { requestType: 'TlPremiumRequest', periodIc: '6MON' },
          { requestType: 'TlPremiumRequest', periodIc: '9MON' },
          { requestType: 'TlPremiumRequest', periodIc: '1YEAR' },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (response.data.errorList && response.data.errorList.length > 0) {
      throw new Error(`${response.data.errorList[0].message}`);
    }

    return formatResponse(response.data);
  } catch (error) {
    throw new Error(`${error.response?.statusText || error.message}`);
  }
};

/**
 * Saves an insurance policy in Balcia’s system and returns the policy data.
 * @param {string} vehicleRegistrationNumber - Car registration number.
 * @param {string} regCertNr - Registration document number.
 * @param {number} policyPeriod - Insurance duration in months.
 * @returns {Promise<object>} - Policy data including `policyId`.
 */
const savePolicy = async (
  vehicleRegistrationNumber,
  regCertNr,
  policyPeriod,
) => {
  const token = await getToken();

  try {
    const response = await axios.post(
      `${process.env.BALCIA_URL}/auto`,
      {
        approve: false,
        save: true,
        agreementDetails: {
          branch: 'LV',
          agrType: 'TL05',
          agrLanguage: 'LV',
          paymentCountIc: 'M1',
          periodIc: `${policyPeriod}MON`,
          isLVRpack: true,
          policyType: 'DEFAULT',
        },
        vehicle: {
          vehicleRegistrationNumber,
          regCertNr,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (response.data.errorList && response.data.errorList.length > 0) {
      throw new Error(`${response.data.errorList[0].message}`);
    }

    return {
      policyId: response.data.agreementDetails.agreementId,
      price: response.data.agreementDetails.premium,
    };
  } catch (error) {
    throw new Error(
      `savePolicy - ${error.response?.statusText || error.message}`,
    );
  }
};

/**
 * Approves an insurance policy in Balcia’s system.
 * @param {string} vehicleRegistrationNumber - Car registration number.
 * @param {string} regCertNr - Registration document number.
 * @param {number} policyPeriod - Insurance duration in months.
 * @param {string} agreementId - Agreement ID.
 * @param {string} customerEmail - Customer email address.
 * @param {string} customerPhone - Customer phone number.
 * @returns {Promise<object>} - Policy data including `policyId`.
 */
const concludePolicy = async (
  vehicleRegistrationNumber,
  regCertNr,
  policyPeriod,
  agreementId,
  customerEmail,
  customerPhone,
) => {
  const token = await getToken();

  try {
    const saveResponse = await axios.post(
      `${process.env.BALCIA_URL}/auto`,
      {
        approve: false,
        save: true,
        agreementDetails: {
          branch: 'LV',
          agrType: 'TL05',
          agrLanguage: 'LV',
          paymentCountIc: 'M1',
          periodIc: `${policyPeriod}MON`,
          isLVRpack: true,
          policyType: 'DEFAULT',
          agreementId,
        },
        vehicle: {
          vehicleRegistrationNumber,
          regCertNr,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (saveResponse.data.errorList && saveResponse.data.errorList.length > 0) {
      throw new Error(`${saveResponse.data.errorList[0].message}`);
    }

    const agreementDetails = saveResponse.data.agreementDetails;

    const response = await axios.post(
      `${process.env.BALCIA_URL}/auto`,
      {
        approve: true,
        save: true,
        agreementDetails: {
          branch: 'LV',
          agrType: 'TL05',
          agrLanguage: 'LV',
          paymentCountIc: 'M1',
          periodIc: `${policyPeriod}MON`,
          isLVRpack: true,
          policyType: 'DEFAULT',
          agreementId,
          holder: {
            registrationCode: agreementDetails.holder_code,
            name: agreementDetails.holder_name,
            firstName: agreementDetails.holder_first_name,
            email: customerEmail,
            phone: customerPhone,
            updateWithProposal: false,
          },
        },
        vehicle: {
          vehicleRegistrationNumber,
          regCertNr,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return response.data; // Return policy data, including policyId
  } catch (error) {
    throw new Error(
      `concludePolicy - ${error.response?.statusText || error.message}`,
    );
  }
};

module.exports = { getPricing, savePolicy, concludePolicy };
