const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3001;
const ALLOWLIST_FILE = path.resolve(__dirname, "../_private/allowed-accounts.json");

function loadAllowedAccounts() {
  try {
    const raw = fs.readFileSync(ALLOWLIST_FILE, "utf8");
    const list = JSON.parse(raw);

    if (!Array.isArray(list)) return new Set();

    return new Set(
      list
        .map((name) => String(name || "").trim())
        .filter(Boolean)
    );
  } catch (error) {
    console.error("Could not load allowlist:", error.message);
    return new Set();
  }
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);

  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*"
  });

  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");

  if (url.pathname === "/health") {
    return sendJson(res, 200, { ok: true });
  }

  if (url.pathname !== "/api/access") {
    return sendJson(res, 404, { ok: false, error: "not_found" });
  }

  const account = String(url.searchParams.get("account") || "").trim();
  const world = String(url.searchParams.get("world") || "").trim();

  const allowedAccounts = loadAllowedAccounts();
  const allowed = allowedAccounts.has(account);

  console.log(JSON.stringify({
    time: new Date().toISOString(),
    account,
    world,
    allowed,
    ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || ""
  }));

  return sendJson(res, 200, {
    ok: true,
    allowed
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`DS access API listening on http://127.0.0.1:${PORT}`);
  console.log(`Allowlist: ${ALLOWLIST_FILE}`);
});