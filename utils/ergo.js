require('dotenv').config();
const axios = require('axios');
const convert = require('xml-js');

const ERGO_API_URL = process.env.ERGO_URL;

/**
 * Parses XML response to JSON format.
 * @param {string} xmlString - XML response from Ergo.
 * @returns {object} - Parsed JSON object.
 */
const parseXmlToJson = (xmlString) => {
  try {
    const json = convert.xml2js(xmlString, { compact: true, spaces: 2 });

    const body = json['soap:Envelope']['soap:Body'];
    let response =
      body['ns2:getOfferDataOCTAResponse']?.return ||
      body['ns2:saveOfferOCTAResponse']?.return ||
      body['ns2:acceptPolicy2Response']?.return;

    const cleanJson = (obj) => {
      if (typeof obj !== 'object' || obj === null) return obj;
      if (obj._text !== undefined) return obj._text;

      if (Array.isArray(obj)) {
        return obj.map(cleanJson);
      }

      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [
          key.replace(/^ns2:/, ''),
          cleanJson(value),
        ]),
      );
    };

    return cleanJson(response);
  } catch (error) {
    console.error('Error parsing and cleaning XML:', error);
    return null;
  }
};

/**
 * Retrieves an authentication token from Ergo.
 * @returns {Promise<string>} - Session key for API requests.
 */
const getToken = async () => {
  try {
    const response = await axios.post(
      ERGO_API_URL,
      `<?xml version="1.0" encoding="utf-8"?>
      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
          <authentificateUser xmlns="http://webservices.dis.ergo.com/">
            <username xmlns="">${process.env.ERGO_USER}</username>
            <password xmlns="">${process.env.ERGO_PASSWORD}</password>
          </authentificateUser>
        </soap:Body>
      </soap:Envelope>`,
      { headers: { 'Content-Type': 'application/xml' } },
    );

    const match = response.data.match(/<return>(.*?)<\/return>/);
    if (!match) throw new Error('No session key in response');

    console.log('Ergo token aqcuired: ', match[1]);
    return match[1];
  } catch (error) {
    throw new Error(
      `getToken - ${error.response?.statusText || error.message}`,
    );
  }
};

/**
 * Formats Ergo's pricing response into a structured object.
 * @param {object} data - Parsed Ergo response object.
 * @returns {object} - Formatted pricing response.
 */
const formatResponse = (data) => {
  if (!data.premiums || !Array.isArray(data.premiums)) {
    throw new Error('No valid pricing data available.');
  }

  const prices = data.premiums.reduce((acc, premium) => {
    const term = parseInt(premium.term);
    const price = parseFloat(premium.premiumAmount);

    if (!isNaN(term) && !isNaN(price)) {
      acc[term] = price;
    }

    return acc;
  }, {});

  return { id: 'ergo', logo: '/ergo.png', prices };
};

/**
 * Retrieves insurance pricing information from Ergo.
 * @param {string} vehicleRegNr - Car registration number.
 * @param {string} vehicleCertNr - Registration document number.
 * @returns {Promise<object>} - Insurance price data.
 */
const getPricing = async (vehicleRegNr, vehicleCertNr) => {
  const sessionKey = await getToken();
  if (!sessionKey) {
    throw new Error('Session key not acquired');
  }

  try {
    const response = await axios.post(
      `${ERGO_API_URL}?wsdl`,
      `<?xml version="1.0" encoding="utf-8"?>
      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
          <getOfferDataOCTA xmlns="http://webservices.dis.ergo.com/">
            <sessionKey xmlns="">${sessionKey}</sessionKey>
            <vehicleRegNr xmlns="">${vehicleRegNr}</vehicleRegNr>
            <vehicleCertNr xmlns="">${vehicleCertNr}</vehicleCertNr>
          </getOfferDataOCTA>
        </soap:Body>
      </soap:Envelope>`,
      { headers: { 'Content-Type': 'application/xml' } },
    );

    const parsedJson = parseXmlToJson(response.data);

    if (parsedJson.status !== '0') {
      throw new Error(`${parsedJson.statusText}`);
    }
    console.log('Ergo pricing aqcuired: ');
    return formatResponse(parsedJson);
  } catch (error) {
    throw new Error(
      `getPricing - ${error.response?.statusText || error.message}`,
    );
  }
};

/**
 * Saves an insurance policy offer in Ergo’s system and returns a policy offer ID.
 * @param {string} vehicleRegNr - Car registration number.
 * @param {string} vehicleCertNr - Registration document number.
 * @param {number} policyPeriod - Insurance duration in months.
 * @returns {Promise<string>} - Policy offer ID if successful.
 */
const savePolicy = async (vehicleRegNr, vehicleCertNr, policyPeriod) => {
  const sessionKey = await getToken();

  // Step 1: Get the Offer Data from Ergo
  const getOfferRequest = `<?xml version="1.0" encoding="utf-8"?>
  <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
      <getOfferDataOCTA xmlns="http://webservices.dis.ergo.com/">
        <sessionKey xmlns="">${sessionKey}</sessionKey>
        <vehicleRegNr xmlns="">${vehicleRegNr}</vehicleRegNr>
        <vehicleCertNr xmlns="">${vehicleCertNr}</vehicleCertNr>
      </getOfferDataOCTA>
    </soap:Body>
  </soap:Envelope>`;

  try {
    const getOfferResponse = await axios.post(ERGO_API_URL, getOfferRequest, {
      headers: { 'Content-Type': 'application/xml' },
    });

    const offerData = parseXmlToJson(getOfferResponse.data);

    if (offerData.status !== '0') {
      throw new Error(`${offerData.statusText}`);
    }

    const premiumsDict = {
      1: 0,
      3: 1,
      6: 2,
      9: 3,
      12: 4,
    };

    // Extract necessary data from offer response
    const policyPremium =
      offerData.premiums[premiumsDict[policyPeriod]].premiumAmount || null;
    const personCode = offerData.ownerCode || null;
    const personName = offerData.ownerName || null;
    const personSurname = offerData.owner || null;

    console.log(policyPremium, personCode, personName, personSurname);

    if (!policyPremium || !personCode || !personName || !personSurname) {
      throw new Error('Missing required fields in getOffer response.');
    }

    // Step 2: Save the Policy Offer using extracted offer data
    const policyIssueDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const policyBeginDate = new Date();
    policyBeginDate.setDate(policyBeginDate.getDate() + 1); // Start tomorrow

    const policyEndDate = new Date(policyBeginDate);
    policyEndDate.setMonth(policyEndDate.getMonth() + policyPeriod);

    const formattedBeginDate = policyBeginDate.toISOString().split('T')[0];
    const formattedEndDate = policyEndDate.toISOString().split('T')[0];

    const saveOfferRequest = `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
      <soap:Body>
        <saveOfferOCTA xmlns="http://webservices.dis.ergo.com/">
          <sessionKey xmlns="">${sessionKey}</sessionKey>
          <vehicleRegNr xmlns="">${vehicleRegNr}</vehicleRegNr>
          <vehicleCertNr xmlns="">${vehicleCertNr}</vehicleCertNr>
          <policyIssueDate xmlns="">${policyIssueDate}</policyIssueDate>
          <policyBeginDate xmlns="">${formattedBeginDate}</policyBeginDate>
          <policyEndDate xmlns="">${formattedEndDate}</policyEndDate>
          <policyPremium xmlns="">${policyPremium}</policyPremium>
          <ownerPersonCode xmlns="">${personCode}</ownerPersonCode>
          <policyReceiverFirstname xmlns="">${personName}</policyReceiverFirstname>
          <policyReceiverSurname xmlns="">${personSurname}</policyReceiverSurname>
        </saveOfferOCTA>
      </soap:Body>
    </soap:Envelope>`;

    const saveOfferResponse = await axios.post(ERGO_API_URL, saveOfferRequest, {
      headers: { 'Content-Type': 'application/xml' },
    });

    const saveOfferData = parseXmlToJson(saveOfferResponse.data);

    console.log(saveOfferData);

    if (saveOfferData.status !== '0') {
      throw new Error(`${saveOfferData.statusText}`);
    }

    return {
      policyId: saveOfferData.policyOfferId,
      price: saveOfferData.policyPremium,
    }; // Return the policy offer ID for later acceptance.
  } catch (error) {
    throw new Error(
      `savePolicy - ${error.response?.statusText || error.message}`,
    );
  }
};

/**
 * Concludes an insurance policy in Ergo’s system.
 * @param {string} policyOfferNumber - Policy offer number from `savePolicy`.
 * @returns {Promise<object>} - Full response object from Ergo.
 */
const concludePolicy = async (policyOfferNumber) => {
  const sessionKey = await getToken();

  const policyBeginDate = new Date();
  policyBeginDate.setDate(policyBeginDate.getDate() + 1);
  const formattedBeginDate = policyBeginDate.toISOString().split('T')[0];

  const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
  <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
      <acceptPolicy2 xmlns="http://webservices.dis.ergo.com/">
        <sessionKey xmlns="">${sessionKey}</sessionKey>
        <policyTypeCode xmlns="">OCTA</policyTypeCode>
        <policyOfferNumber xmlns="">${policyOfferNumber}</policyOfferNumber>
        <policyOfferBeginDate xmlns="">${formattedBeginDate}</policyOfferBeginDate>
      </acceptPolicy2>
    </soap:Body>
  </soap:Envelope>`;

  try {
    const response = await axios.post(ERGO_API_URL, soapRequest, {
      headers: { 'Content-Type': 'application/xml' },
    });

    const parsedJson = parseXmlToJson(response.data);

    if (parsedJson.status !== '0') {
      throw new Error(`Conclude Policy Error: ${parsedJson.statusText}`);
    }

    return parsedJson; // Return full response as we may need policy number or other details.
  } catch (error) {
    throw new Error(
      `Conclude Policy Error: ${error.response?.statusText || error.message}`,
    );
  }
};

module.exports = { getToken, getPricing, savePolicy, concludePolicy };
