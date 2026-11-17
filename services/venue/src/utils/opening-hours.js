const HOUR_PATTERN = /^([01]\d|2[0-3]):00$/;

function timeToMinutes(value) {
  const [hours, minutes] = String(value).split(":").map(Number);
  return hours * 60 + minutes;
}

function isFullHour(value) {
  return typeof value === "string" && HOUR_PATTERN.test(value);
}

function normalizePeakDays(peakDays) {
  if (Array.isArray(peakDays)) {
    return peakDays.map((day) => Number(day)).filter((day) => day >= 1 && day <= 7);
  }
  if (typeof peakDays === "string" && peakDays.trim()) {
    try {
      const parsed = JSON.parse(peakDays);
      if (Array.isArray(parsed)) return normalizePeakDays(parsed);
    } catch {
      return peakDays
        .split(",")
        .map((day) => Number(day.trim()))
        .filter((day) => day >= 1 && day <= 7);
    }
  }
  return [];
}

function formatTime(value) {
  if (value == null) return null;
  const text = String(value);
  if (/^\d{2}:\d{2}:\d{2}$/.test(text)) return text.slice(0, 5);
  if (/^\d{2}:\d{2}$/.test(text)) return text;
  return text;
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
    if (!isFullHour(day.openFrom) || !isFullHour(day.openTo)) {
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
  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    return {
      code: "sportsGround/invalidDtoIn",
      message: "Vstupní data nejsou validní.",
      params: { invalidFields: ["basePrice"] },
    };
  }

  const hasPeak = Boolean(priceList.hasPeak);
  const peakDays = normalizePeakDays(priceList.peakDays);
  const peakFrom = priceList.peakFrom == null || priceList.peakFrom === "" ? null : formatTime(priceList.peakFrom);
  const peakTo = priceList.peakTo == null || priceList.peakTo === "" ? null : formatTime(priceList.peakTo);
  const peakPrice = priceList.peakPrice == null || priceList.peakPrice === "" ? null : Number(priceList.peakPrice);

  if (hasPeak) {
    if (!Number.isFinite(peakPrice) || peakPrice <= 0) {
      return {
        code: "sportsGround/invalidDtoIn",
        message: "Vstupní data nejsou validní.",
        params: { invalidFields: ["peakPrice"] },
      };
    }
    if (peakDays.length === 0) {
      return {
        code: "sportsGround/invalidDtoIn",
        message: "Vstupní data nejsou validní.",
        params: { invalidFields: ["peakDays"] },
      };
    }
    if (!isFullHour(peakFrom) || !isFullHour(peakTo)) {
      return {
        code: "sportsGround/invalidDtoIn",
        message: "Vstupní data nejsou validní.",
        params: { invalidFields: ["peakFrom", "peakTo"] },
      };
    }
    if (timeToMinutes(peakTo) <= timeToMinutes(peakFrom)) {
      return {
        code: "sportsGround/invalidOpeningHours",
        message: "Konec otevírací doby musí být později než začátek.",
        params: { field: "peak" },
      };
    }

    const byDay = new Map(days.map((day) => [day.dayOfWeek, day]));
    for (const dayOfWeek of peakDays) {
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
      peakDays: hasPeak ? peakDays : [],
      peakFrom: hasPeak ? peakFrom : null,
      peakTo: hasPeak ? peakTo : null,
    },
  };
}

export {
  formatTime,
  normalizePeakDays,
  validateOpeningHoursAndPriceList,
};
