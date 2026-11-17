const DEFAULT_SECRET = "local-dev-gateway-secret";
const gatewaySecret = process.env.GATEWAY_INTERNAL_SECRET || DEFAULT_SECRET;

function forwardUser(req, res, next) {
  delete req.headers["x-user-id"];
  delete req.headers["x-user-role"];
  delete req.headers["x-system-key"];
  delete req.headers["x-gateway-secret"];
  delete req.headers.authorization;

  req.headers["x-gateway-secret"] = gatewaySecret;

  if (req.user) {
    req.headers["x-user-id"] = req.user.id;
    if (req.user.role) {
      req.headers["x-user-role"] = req.user.role;
    }
  }
  return next();
}

export default forwardUser;
