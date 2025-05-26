require('dotenv').config();
const axios = require('axios');

const testSebGet = async () => {
  const payment_reference =
    'd5e20da320337d2d4845a3af2875d286a23c0683918a37597b11f7b971a10772';

  console.log('SEB_API_USERNAME:', process.env.SEB_API_USERNAME);
  console.log('SEB_API_SECRET:', process.env.SEB_API_SECRET);
  console.log('SEB_API_URL:', process.env.SEB_API_URL);

  const authString = `${process.env.SEB_API_USERNAME}:${process.env.SEB_API_SECRET}`;
  const authHeader = `Basic ${Buffer.from(authString).toString('base64')}`;

  console.log('Auth String:', authString);
  console.log('Encoded Auth Header:', authHeader);

  const response = await axios.get(
    `${process.env.SEB_API_URL}/v4/payments/${payment_reference}?api_username=${process.env.SEB_API_USERNAME}`,
    {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    },
  );

  console.log(response.data);
};

testSebGet();
