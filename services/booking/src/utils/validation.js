// Společné odpovědi a pomocné funkce pro ABL – stejný tvar jako ve službě venue.

function trimDtoIn(dtoIn = {}) {
  const result = {};
  for (const [key, value] of Object.entries(dtoIn)) {
    result[key] = typeof value === "string" ? value.trim() : value;
  }
  return result;
}

function invalidFieldsFromErrors(errors = []) {
  const fields = new Set();
  for (const error of errors) {
    if (error.instancePath) {
      fields.add(error.instancePath.replace(/^\//, "").split("/")[0]);
    } else if (error.params?.missingProperty) {
      fields.add(error.params.missingProperty);
    }
  }
  return [...fields].filter(Boolean);
}

function sportsGroundInvalidDtoIn(errors) {
  return {
    code: "sportsGround/invalidDtoIn",
    message: "Vstupní data nejsou validní.",
    params: { invalidFields: invalidFieldsFromErrors(errors) },
  };
}

function unauthenticated(res) {
  return res.status(401).json({
    code: "user/unauthenticated",
    message: "Uživatel není přihlášený.",
    params: {},
  });
}

function forbidden(res, role) {
  return res.status(403).json({
    code: "user/forbidden",
    message: "K této akci nemáte oprávnění.",
    params: { role },
  });
}

function dateInPast(res, date, today) {
  return res.status(400).json({
    code: "sportsGround/dateInPast",
    message: "Datum nesmí být v minulosti.",
    params: { date, today },
  });
}

export { trimDtoIn, sportsGroundInvalidDtoIn, unauthenticated, forbidden, dateInPast };
