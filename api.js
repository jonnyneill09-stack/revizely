const { handleApi } = require("../server/api");

module.exports = async (req, res) => {
  const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);

  try {
    await handleApi(
      {
        method: req.method,
        headers: req.headers,
        on: req.on?.bind(req)
      },
      {
        writeHead: (status, headers) => res.writeHead(status, headers),
        end: (body) => res.end(body),
        setHeader: (name, value) => res.setHeader(name, value),
        get headersSent() {
          return res.headersSent;
        }
      },
      url.pathname
    );
  } catch (error) {
    if (!res.headersSent) {
      res.status(error.status || 500).json({
        error: error.message || "Internal server error."
      });
    }
  }
};
