const autoController = (req, res) => {
  if (!res.data || res.data.length === 0) {
    return res.status(200).json([]);
  }

  if (res.data.length === 1) {
    return res.status(200).json(res.data[0]);
  }

  res.status(200).json(res.data);
};

module.exports = { autoController };
