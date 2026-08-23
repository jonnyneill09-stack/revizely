const { handleApi } = require("../server/api");

module.exports = async (req, res) => {
  return handleApi(req, res);
};
