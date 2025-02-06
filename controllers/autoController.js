const autoController = (req, res) => {
  res.status(200).send(res.data || []);
};

module.exports = { autoController };
