// Single Vercel entry point for every /api/* request.
// Keep the routing logic in the shared backend handler.
const { handleApi } = require("../backend/api");

module.exports = async (req, res) => {
  const pathname = new URL(req.url || "/", "http://localhost").pathname;
  try {
    return await handleApi(req, res, pathname);
  } catch (error) {
    if (!res.headersSent) {
      res.writeHead(error.status || 500, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      });
      res.end(JSON.stringify({
        error: error.status ? error.message : "Internal server error."
      }));
    }
  }
};
