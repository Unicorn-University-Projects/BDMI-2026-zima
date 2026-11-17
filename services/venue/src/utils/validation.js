function trimDtoIn(dtoIn = {}) {
  const result = {};
  for (const [key, value] of Object.entries(dtoIn)) {
    result[key] = typeof value === "string" ? value.trim() : value;
  }
  return result;
}

function normalizeText(value) {
  return String(value).trim().replace(/\s+/g, " ");
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

function invalidDtoIn(errors) {
  return {
    code: "venue/invalidDtoIn",
    message: "Vstupní data nejsou validní.",
    params: { invalidFields: invalidFieldsFromErrors(errors) },
  };
}

function sportsGroundInvalidDtoIn(errors) {
  return {
    code: "sportsGround/invalidDtoIn",
    message: "Vstupní data nejsou validní.",
    params: { invalidFields: invalidFieldsFromErrors(errors) },
  };
}

export {
  trimDtoIn,
  normalizeText,
  invalidDtoIn,
  sportsGroundInvalidDtoIn,
};
