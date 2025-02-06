require('dotenv').config();

const convert = require('xml-js');

const parseXmlToJson = (xmlString) => {
  try {
    // Convert XML to JSON
    const json = convert.xml2js(xmlString, { compact: true, spaces: 2 });

    // Extract relevant data from the SOAP response
    const body = json['soap:Envelope']['soap:Body'];
    let response = body['ns2:getOfferDataOCTAResponse']['return'];

    // Function to clean JSON by removing `_text` wrappers and namespace prefixes
    const cleanJson = (obj) => {
      if (typeof obj !== 'object' || obj === null) return obj;

      if (obj._text !== undefined) return obj._text; // Extract the text directly

      if (Array.isArray(obj)) {
        return obj.map(cleanJson); // Clean each item in arrays
      }

      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [
          key.replace(/^ns2:/, ''), // Remove `ns2:` prefix
          cleanJson(value), // Recursively clean values
        ]),
      );
    };

    return cleanJson(response);
  } catch (error) {
    console.error('Error parsing and cleaning XML:', error);
    return null;
  }
};

const getToken = async () => {
  const authReqOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/xml',
    },
    body: `<?xml version="1.0" encoding="utf-8"?>
      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
          <authentificateUser xmlns="http://webservices.dis.ergo.com/">
            <username xmlns="">${process.env.ERGO_USER}</username>
            <password xmlns="">${process.env.ERGO_PASSWORD}</password>
          </authentificateUser>
        </soap:Body>
      </soap:Envelope>`,
  };

  const response = await fetch(`${process.env.ERGO_URL}`, authReqOptions);

  if (!response.ok) {
    throw new Error(
      `ERGO:getToken - Network response was not ok ${response.statusText}`,
    );
  }
  const responseData = await response.text();
  const match = responseData.match(/<return>(.*?)<\/return>/);
  return match ? match[1] : null;
};

const formatResponse = (data) => {
  const prices = data.premiums.reduce((acc, premium) => {
    acc[parseInt(premium.term)] = parseFloat(premium.premiumAmount);
    return acc;
  }, {});

  return { id: 'ergo', logo: '/ergo.png', prices };
};

const auto = async (reg, vin) => {
  const sessionKey = await getToken();
  if (!sessionKey) {
    throw new Error('ERGO:auto - session key not acquired');
  }

  const autoReqOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/xml',
    },
    body: `<?xml version="1.0" encoding="utf-8"?>
      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
          <getOfferDataOCTA xmlns="http://webservices.dis.ergo.com/">
            <sessionKey xmlns="">${sessionKey}</sessionKey>
            <vehicleRegNr xmlns="">${reg}</vehicleRegNr>
            <vehicleCertNr xmlns="">${vin}</vehicleCertNr>
          </getOfferDataOCTA>
        </soap:Body>
      </soap:Envelope>`,
  };

  const response = await fetch(`${process.env.ERGO_URL}?wsdl`, autoReqOptions);
  if (!response.ok) {
    throw new Error(
      `ERGO:auto - Network response was not ok ${response.statusText}`,
    );
  }
  const responseData = await response.text();
  const parsedJson = parseXmlToJson(responseData);
  return formatResponse(parsedJson);
};

module.exports = auto;
