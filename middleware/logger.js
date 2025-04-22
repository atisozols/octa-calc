const logger = (req, res, next) => {
  const messageIn = {
    type: 'in',
    body: req.body,
    method: req.method,
    path: req.url,
    dateTime: new Date().toISOString(),
  };
  console.log(messageIn);

  let responseSent = false;
  const originalJson = res.json;
  res.json = (data) => {
    if (!responseSent) {
      responseSent = true;

      const messageOut = {
        type: 'out',
        body: data,
        dateTime: new Date().toISOString(),
        fault: res.statusCode !== 200 ? data.message || 'Unknown error' : '',
      };

      console.log(messageOut);
    }

    return originalJson.call(res, data);
  };

  next();
};

module.exports = logger;
