import permissions from "../permissions.js";

function forbidden(res, commandPath) {
  return res.status(403).json({
    code: "user/forbidden",
    message: "K této akci nemáte oprávnění.",
    params: { command: commandPath },
  });
}

function authorize(req, res, next) {
  const { commandPath, profiles, user } = req;

  if (!profiles) {
    return forbidden(res, commandPath);
  }
  if (profiles.includes("Public")) {
    return next();
  }

  if (user.role === null) {
    if (permissions.roleNotSetAllowed.includes(commandPath)) {
      return next();
    }
    return res.status(403).json({
      code: "user/roleNotSet",
      message: "Nejdříve si vyberte roli.",
      params: {},
    });
  }

  const profile = permissions.roleProfiles[user.role];
  if (profile && (profiles.includes("Authenticated") || profiles.includes(profile))) {
    return next();
  }
  return forbidden(res, commandPath);
}

export default authorize;
