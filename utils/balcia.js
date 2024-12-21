const getToken = async () => {
  const authReqOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: process.env.BALCIA_USER,
      password: process.env.BALCIA_PASSWORD,
    }),
  };

  const response = await fetch(
    `${process.env.BALCIA_URL}/auth`,
    authReqOptions,
  );

  if (!response.ok) {
    throw new Error(
      `Balcia:getToken - Network response was not ok ${response.statusText}`,
    );
  }
  const responseData = await response.json();

  return responseData.token ? responseData.token : null;
};

// agrLanguage: 'LV', //izdrukas izmantotā valoda
// paymentCountIc: 'M1', //M1 M2 M3... Jāskatās kādas lomas piešķirtas, nevar būt
//                        lielāks par periodu noteikti, Pārsvarā lieto M1
// periodIc: '1MON', //Polises periods - 1MON 2MON .... 11MON, 1YEAR,
//                     Jāskatās pēc lomām, kuri ir pieejami
// isLVRpack: true, //papildrisku paka, nav obligāti jāiekļauj
// vehicle: jālieto vai nu mašīnas reģistrācijas apliecības numurs vai personas kods

const auto = async (vehicleRegistrationNumber, regCertNr) => {
  const token = await getToken();
  console.log('token aquired');
  if (!token) {
    throw new Error('Balcia:auto - token not aquired');
  }

  const autoReqOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
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
        // 1MON opcija arī
        {
          requestType: 'TlPremiumRequest',
          periodIc: '1MON',
        },
        {
          requestType: 'TlPremiumRequest',
          periodIc: '3MON',
        },
        {
          requestType: 'TlPremiumRequest',
          periodIc: '6MON',
        },
        {
          requestType: 'TlPremiumRequest',
          periodIc: '9MON',
        },
        {
          requestType: 'TlPremiumRequest',
          periodIc: '1YEAR',
        },
      ],
    }),
  };

  const response = await fetch(
    `${process.env.BALCIA_URL}/auto`,
    autoReqOptions,
  );

  if (!response.ok) {
    console.log(response);
    throw new Error(
      `Balcia:auto - Network response was not ok ${response.statusText}`,
    );
  }

  const data = await response.json();
  return data;
};

module.exports = { getToken, auto };
