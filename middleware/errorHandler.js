const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${err.message}`);

  if (
    err.message.startsWith('ERGO:') ||
    err.message.startsWith('Balcia:') ||
    err.message.startsWith('Balta:')
  ) {
    return res.status(400).json({ message: err.message });
  }

  res.status(500).json({
    message: 'Something went wrong. Please try again later.',
  });
};

module.exports = errorHandler;
