// ==========================================
// GENEROVÁNÍ HODINOVÝCH SLOTŮ
// ==========================================
//
// Podle Application Modelu (SportsGround.openingHours a priceList):
// - otevírací doba se dělí na hodinové sloty začínající v celou,
//   první slot začíná v openFrom, poslední končí v openTo,
// - slot je ve špičce, když peakFrom <= začátek slotu < peakTo a den je v peakDays,
// - obsazený slot má rezervaci ve stavu "created" nebo "confirmed".
// Stejná pravidla používá náhled slotů ve frontendu (utils/openingHours.js).
//
// Datum je vždy text "YYYY-MM-DD", čas "HH:00", den v týdnu 1 = pondělí … 7 = neděle.
// Časy se počítají v českém čase (Europe/Prague) bez ohledu na časové pásmo serveru.

export const TIME_ZONE = "Europe/Prague";

export const SLOT_STATUS = {
  free: "free",
  occupied: "occupied",
  past: "past",
};

// "08:00" i "08:00:00" (sloupec typu TIME) -> 8; prázdná hodnota -> null
export function parseHour(value) {
  if (value == null || value === "") return null;
  const hour = Number(String(value).split(":")[0]);
  return Number.isInteger(hour) ? hour : null;
}

export function formatHour(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}

// "2026-11-23" -> 1 (pondělí) … 7 (neděle)
export function getDayOfWeek(date) {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

export function addDays(date, days) {
  const [year, month, day] = date.split("-").map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return result.toISOString().slice(0, 10);
}

// Dnešní datum a čas v Praze: { date: "2026-11-23", hour: 14, minute: 5 }
export function getPragueNow(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

// Otevírací doba pro konkrétní den v týdnu; chybějící nebo neplatný den = zavřeno.
export function getOpeningHoursForDay(openingHours = [], dayOfWeek) {
  const day = openingHours.find((item) => Number(item.dayOfWeek) === dayOfWeek);
  const openFrom = parseHour(day?.openFrom);
  const openTo = parseHour(day?.openTo);
  if (!day || day.isClosed || openFrom == null || openTo == null || openTo <= openFrom) {
    return { isClosed: true, openFrom: null, openTo: null };
  }
  return { isClosed: false, openFrom, openTo };
}

function getPeakWindow(priceList, dayOfWeek) {
  if (!priceList?.hasPeak || priceList.peakPrice == null) return null;
  const peakDays = (priceList.peakDays ?? []).map(Number);
  if (!peakDays.includes(dayOfWeek)) return null;
  const peakFrom = parseHour(priceList.peakFrom);
  const peakTo = parseHour(priceList.peakTo);
  if (peakFrom == null || peakTo == null || peakTo <= peakFrom) return null;
  return { peakFrom, peakTo };
}

/**
 * Vygeneruje hodinové sloty sportoviště pro jeden den.
 *
 * @param {object} input
 * @param {Array} input.openingHours  7 dnů { dayOfWeek, openFrom, openTo, isClosed }
 * @param {object|null} input.priceList { regularPrice, hasPeak, peakPrice, peakDays, peakFrom, peakTo }
 * @param {string} input.date         "YYYY-MM-DD"
 * @param {Iterable<string>} [input.occupiedStartTimes] začátky obsazených slotů ("HH:00")
 * @param {object} [input.now]        { date, hour, minute } v Praze – sloty, které už začaly, jsou "past"
 * @returns {{ dayOfWeek: number, isClosed: boolean, slotList: Array }}
 */
export function generateSlots({ openingHours, priceList, date, occupiedStartTimes = [], now = null }) {
  const dayOfWeek = getDayOfWeek(date);
  const day = getOpeningHoursForDay(openingHours, dayOfWeek);
  const regularPrice = priceList?.regularPrice ?? priceList?.basePrice;

  // Bez ceníku se sportoviště nenabízí – nemá žádné sloty.
  if (day.isClosed || regularPrice == null) {
    return { dayOfWeek, isClosed: true, slotList: [] };
  }

  const occupied = new Set([...occupiedStartTimes].map((value) => formatHour(parseHour(value))));
  const peak = getPeakWindow(priceList, dayOfWeek);
  const isToday = now?.date === date;
  const isPastDay = now != null && date < now.date;

  const slotList = [];
  for (let hour = day.openFrom; hour < day.openTo; hour += 1) {
    const startTime = formatHour(hour);
    const isPeak = peak != null && hour >= peak.peakFrom && hour < peak.peakTo;

    let status = SLOT_STATUS.free;
    if (occupied.has(startTime)) {
      status = SLOT_STATUS.occupied;
    } else if (isPastDay || (isToday && hour <= now.hour)) {
      // Slot, který už začal (nebo celý den v minulosti), nejde rezervovat.
      status = SLOT_STATUS.past;
    }

    slotList.push({
      startTime,
      endTime: formatHour(hour + 1),
      price: Number(isPeak ? priceList.peakPrice : regularPrice),
      isPeak,
      status,
    });
  }

  return { dayOfWeek, isClosed: false, slotList };
}

export function getFreeSlots(slotList) {
  return slotList.filter((slot) => slot.status === SLOT_STATUS.free);
}
