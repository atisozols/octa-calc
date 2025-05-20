const axios = require('axios');
const { json } = require('body-parser');
const fs = require('fs');
const https = require('https');
const path = require('path');
const { parseStringPromise } = require('xml2js');

const pfxPath = path.resolve(__dirname, '../certs/balta.pfx');

const agent = new https.Agent({
  pfx: fs.readFileSync(pfxPath),
  passphrase: '',
  minVersion: 'TLSv1.2',
});

const BALTA_API_URL = process.env.BALTA_API_URL;

/**
 * Retrieves pricing information for a vehicle based on its registration number and document number.
 * @param {string} vehicleRegNr - Car registration number.
 * @param {string} vehicleRegCertNr - Registration document number.
 * @returns {Promise<object>} - Returns an object with insurance prices for different durations.
 */
const getPricing = async (vehicleRegNr, vehicleRegCertNr) => {
  const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
  <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
      <Calculate xmlns="http://www.balta.lv/">
        <CalculateInput>
          <VehicleRegNr>${vehicleRegNr}</VehicleRegNr>
          <VehicleRegCertNr>${vehicleRegCertNr}</VehicleRegCertNr>
        </CalculateInput>
      </Calculate>
    </soap:Body>
  </soap:Envelope>`.trim();

  const contentLength = Buffer.byteLength(soapRequest, 'utf-8');

  try {
    const response = await axios.post(BALTA_API_URL, soapRequest, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: '"http://www.balta.lv/Calculate"',
        'Content-Length': contentLength.toString(),
        'User-Agent': 'curl/8.7.1',
      },
      transformRequest: [(data) => data],
      httpsAgent: agent,
    });

    const jsonData = await parseStringPromise(response.data, {
      explicitArray: false,
    });

    const messages =
      jsonData['soap:Envelope']['soap:Body']['CalculateResponse'][
        'CalculateResult'
      ]['Message'];

    if (messages) {
      const messageArray = Array.isArray(messages.Message)
        ? messages.Message
        : [messages.Message]; // Convert to array if it's a single object

      const errorMessage = messageArray.find((msg) => msg.Type === '1');
      if (errorMessage) {
        throw new Error(`${errorMessage.Text}`);
      }
    }

    return formatResponse(jsonData);
  } catch (error) {
    throw new Error(`${error.message}`);
  }
};

/**
 * Formats the response from Balta's pricing API into a structured format.
 * @param {object} data - The raw SOAP response parsed into JSON.
 * @returns {object} - Formatted response with insurance prices.
 */
const formatResponse = (data) => {
  const calculationVariants =
    data['soap:Envelope']['soap:Body']['CalculateResponse']['CalculateResult'][
      'CalculationVariants'
    ]['CalculationVariant'];

  const prices = Array.isArray(calculationVariants)
    ? calculationVariants.reduce((acc, item) => {
        acc[parseInt(item.PolicyPeriod)] = parseFloat(item.PolicyPremium);
        return acc;
      }, {})
    : {};

  return { id: 'balta', logo: '/balta.png', prices };
};

/**
 * Saves an insurance policy in Balta’s system and returns a policy ID.
 * @param {string} vehicleRegNr - Car registration number.
 * @param {string} vehicleRegCertNr - Registration document number.
 * @param {number} policyPeriod - Insurance duration in months (1, 3, 6, 9, 12).
 * @returns {Promise<string>} - Policy ID if successful.
 */
const savePolicy = async (vehicleRegNr, vehicleRegCertNr, policyPeriod) => {
  const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
  <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
      <Save xmlns="http://www.balta.lv/">
        <SaveInput>
          <VehicleRegNr>${vehicleRegNr}</VehicleRegNr>
          <VehicleRegCertNr>${vehicleRegCertNr}</VehicleRegCertNr>
          <PolicyPeriod>${policyPeriod}</PolicyPeriod>
          <PolicyStartDate>${new Date().toISOString()}</PolicyStartDate>
        </SaveInput>
      </Save>
    </soap:Body>
  </soap:Envelope>`;

  try {
    const response = await axios.post(BALTA_API_URL, soapRequest, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: '"http://www.balta.lv/Save"',
      },
      httpsAgent: agent,
    });

    const jsonData = await parseStringPromise(response.data, {
      explicitArray: false,
    });

    const messages =
      jsonData['soap:Envelope']['soap:Body']['SaveResponse']['SaveResult'][
        'Message'
      ];

    if (messages) {
      const messageArray = Array.isArray(messages.Message)
        ? messages.Message
        : [messages.Message]; // Convert to array if it's a single object

      const errorMessage = messageArray.find((msg) => msg.Type === '1');
      if (errorMessage) {
        throw new Error(`${errorMessage.Text}`);
      }
    }

    const policyId =
      jsonData['soap:Envelope']['soap:Body']['SaveResponse']['SaveResult'][
        'PolicyID'
      ];

    const price =
      jsonData['soap:Envelope']['soap:Body']['SaveResponse']['SaveResult'][
        'PolicyPremium'
      ];

    if (!policyId) {
      throw new Error('Failed to retrieve policy ID from Balta.');
    }

    return { policyId, price };
  } catch (error) {
    throw new Error(`savePolicy - ${error.message}`);
  }
};

/**
 * Concludes an insurance policy using its policy ID.
 * @param {string} policyId - Policy ID from the `savePolicy` function.
 * @returns {Promise<object>} - Full response object from Balta.
 */
const concludePolicy = async (policyId) => {
  const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
  <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
      <Conclude xmlns="http://www.balta.lv/">
        <ConcludeInput>
          <PolicyID>${policyId}</PolicyID>
        </ConcludeInput>
      </Conclude>
    </soap:Body>
  </soap:Envelope>`;

  try {
    const response = await axios.post(BALTA_API_URL, soapRequest, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: '"http://www.balta.lv/Conclude"',
      },
      httpsAgent: agent,
    });

    const jsonData = await parseStringPromise(response.data, {
      explicitArray: false,
    });

    return jsonData; // Returning the full response as we don’t know the exact structure
  } catch (error) {
    throw new Error(`concludePolicy - ${error.message}`);
  }
};

module.exports = { getPricing, savePolicy, concludePolicy };
