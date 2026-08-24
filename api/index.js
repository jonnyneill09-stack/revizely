const { handleApi } = require("../server/api");

module.exports = async (req, res) => {
  const pathname = new URL(req.url || "/", "http://localhost").pathname;
  return handleApi(req, res, pathname);
};
