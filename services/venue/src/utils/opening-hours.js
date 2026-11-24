const START_HOUR_PATTERN = /^([01]\d|2[0-3]):00$/;
const END_HOUR_PATTERN = /^([01]\d|2[0-3]|24):00$/;

function timeToMinutes(value) {
  const [hours, minutes] = String(value).split(":").map(Number);
  return hours * 60 + minutes;
}

function isStartHour(value) {
  return typeof value === "string" && START_HOUR_PATTERN.test(value);
}

function isEndHour(value) {
  return typeof value === "string" && END_HOUR_PATTERN.test(value);
}

function parsePeakDays(peakDays) {
  if (Array.isArray(peakDays)) {
    return peakDays.map((day) => Number(day)).filter((day) => Number.isInteger(day) && day >= 1 && day <= 7);
  }
  if (typeof peakDays === "string" && peakDays.trim()) {
    try {
      const parsed = JSON.parse(peakDays);
      if (Array.isArray(parsed)) return parsePeakDays(parsed);
    } catch {
      return peakDays
        .split(",")
        .map((day) => Number(day.trim()))
        .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7);
    }
  }
  return [];
}

function validatePeakDays(peakDays) {
  if (!Array.isArray(peakDays)) return false;
  const seen = new Set();
  for (const day of peakDays) {
    if (typeof day !== "number" || !Number.isInteger(day) || day < 1 || day > 7) {
      return false;
    }
    if (seen.has(day)) return false;
    seen.add(day);
  }
  return true;
}

function isValidPrice(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  if (value < 1 || value > 99999) return false;
  const cents = value * 100;
  return Math.abs(cents - Math.round(cents)) < 1e-6;
}

function formatTime(value) {
  if (value == null) return null;
  const text = String(value);
  if (/^\d{2}:\d{2}:\d{2}$/.test(text)) return text.slice(0, 5);
  if (/^\d{2}:\d{2}$/.test(text)) return text;
  return text;
}

function priceError(field) {
  return {
    code: "sportsGround/invalidDtoIn",
    message: "Vstupní data nejsou validní.",
    params: { invalidFields: [field] },
  };
}

function validateOpeningHoursAndPriceList({ openingHours, priceList }) {
  if (!Array.isArray(openingHours) || openingHours.length !== 7) {
    return {
      code: "sportsGround/invalidDtoIn",
      message: "Vstupní data nejsou validní.",
      params: { invalidFields: ["openingHours"] },
    };
  }

  const days = openingHours
    .map((day) => ({
      dayOfWeek: Number(day.dayOfWeek),
      isClosed: Boolean(day.isClosed),
      openFrom: day.openFrom == null || day.openFrom === "" ? null : formatTime(day.openFrom),
      openTo: day.openTo == null || day.openTo === "" ? null : formatTime(day.openTo),
    }))
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  if (new Set(days.map((day) => day.dayOfWeek)).size !== 7 || days.some((day) => day.dayOfWeek < 1 || day.dayOfWeek > 7)) {
    return {
      code: "sportsGround/invalidDtoIn",
      message: "Vstupní data nejsou validní.",
      params: { invalidFields: ["openingHours"] },
    };
  }

  let openDayCount = 0;
  for (const day of days) {
    if (day.isClosed) {
      day.openFrom = null;
      day.openTo = null;
      continue;
    }
    openDayCount += 1;
    if (!isStartHour(day.openFrom) || !isEndHour(day.openTo)) {
      return {
        code: "sportsGround/invalidDtoIn",
        message: "Vstupní data nejsou validní.",
        params: { invalidFields: ["openingHours"] },
      };
    }
    if (timeToMinutes(day.openTo) <= timeToMinutes(day.openFrom)) {
      return {
        code: "sportsGround/invalidOpeningHours",
        message: "Konec otevírací doby musí být později než začátek.",
        params: { dayOfWeek: day.dayOfWeek },
      };
    }
  }

  if (openDayCount === 0) {
    return {
      code: "sportsGround/invalidDtoIn",
      message: "Vstupní data nejsou validní.",
      params: { invalidFields: ["openingHours"] },
    };
  }

  const basePrice = Number(priceList.basePrice ?? priceList.regularPrice);
  if (!isValidPrice(basePrice)) {
    const field =
      priceList.regularPrice != null && priceList.basePrice == null ? "regularPrice" : "basePrice";
    return priceError(field);
  }

  const hasPeak = Boolean(priceList.hasPeak);
  const rawPeakDays = priceList.peakDays ?? [];
  const peakFrom = priceList.peakFrom == null || priceList.peakFrom === "" ? null : formatTime(priceList.peakFrom);
  const peakTo = priceList.peakTo == null || priceList.peakTo === "" ? null : formatTime(priceList.peakTo);
  const peakPrice = priceList.peakPrice == null || priceList.peakPrice === "" ? null : Number(priceList.peakPrice);

  if (hasPeak) {
    if (!isValidPrice(peakPrice)) {
      return priceError("peakPrice");
    }
    if (!validatePeakDays(rawPeakDays) || rawPeakDays.length === 0) {
      return {
        code: "sportsGround/invalidDtoIn",
        message: "Vstupní data nejsou validní.",
        params: { invalidFields: ["peakDays"] },
      };
    }
    if (!isStartHour(peakFrom) || !isEndHour(peakTo)) {
      return {
        code: "sportsGround/invalidDtoIn",
        message: "Vstupní data nejsou validní.",
        params: { invalidFields: ["peakFrom", "peakTo"] },
      };
    }
    if (timeToMinutes(peakTo) <= timeToMinutes(peakFrom)) {
      return {
        code: "sportsGround/invalidPeakTime",
        message: "Konec špičky musí být později než začátek.",
        params: { field: "peak" },
      };
    }

    const byDay = new Map(days.map((day) => [day.dayOfWeek, day]));
    for (const dayOfWeek of rawPeakDays) {
      const day = byDay.get(dayOfWeek);
      if (!day || day.isClosed) {
        return {
          code: "sportsGround/peakOutsideOpeningHours",
          message: "Čas špičky musí být v rámci otevírací doby.",
          params: { dayOfWeek },
        };
      }
      if (
        timeToMinutes(peakFrom) < timeToMinutes(day.openFrom) ||
        timeToMinutes(peakTo) > timeToMinutes(day.openTo)
      ) {
        return {
          code: "sportsGround/peakOutsideOpeningHours",
          message: "Čas špičky musí být v rámci otevírací doby.",
          params: { dayOfWeek },
        };
      }
    }
  }

  return {
    openingHours: days,
    priceList: {
      basePrice,
      regularPrice: basePrice,
      hasPeak,
      peakPrice: hasPeak ? peakPrice : null,
      peakDays: hasPeak ? [...rawPeakDays] : [],
      peakFrom: hasPeak ? peakFrom : null,
      peakTo: hasPeak ? peakTo : null,
    },
  };
}

export {
  formatTime,
  parsePeakDays as normalizePeakDays,
  parsePeakDays,
  validateOpeningHoursAndPriceList,
};
