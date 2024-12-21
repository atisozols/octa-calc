const convert = require('xml-js');

const formatResponse = (req, res, next) => {
  const acceptHeader = req.headers.accept || '';
  let responseType = 'application/json';

  if (acceptHeader.includes('application/xml')) {
    responseType = 'application/xml';
  }

  const originalJson = res.json;
  res.json = (data) => {
    if (responseType === 'application/xml') {
      const xmlData = convert.json2xml(data, { compact: true, spaces: 2 });
      res.type('application/xml').send(xmlData);
    } else {
      originalJson.call(res, data);
    }
  };

  next();
};

module.exports = formatResponse;
