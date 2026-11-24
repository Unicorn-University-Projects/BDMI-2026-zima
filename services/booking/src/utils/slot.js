const START_HOUR_PATTERN = /^([01]\d|2[0-3]):00$/;
const END_HOUR_PATTERN = /^([01]\d|2[0-3]|24):00$/;

function timeToMinutes(value) {
  const [hours, minutes] = String(value).split(":").map(Number);
  return hours * 60 + minutes;
}

function addOneHour(startTime) {
  const minutes = timeToMinutes(startTime) + 60;
  const hours = Math.floor(minutes / 60);
  return `${String(hours).padStart(2, "0")}:00`;
}

/** Schema: 1 = pondělí … 7 = neděle (JS getUTCDay: neděle = 0). */
function dayOfWeekFromDate(date) {
  const jsDay = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return jsDay === 0 ? 7 : jsDay;
}

function isSlotInPast(date, startTime, now = new Date()) {
  return new Date(`${date}T${startTime}:00.000Z`).getTime() <= now.getTime();
}

function isWithinOpeningHours(dayHours, startTime) {
  if (!dayHours || dayHours.isClosed || !dayHours.openFrom || !dayHours.openTo) {
    return false;
  }
  if (!START_HOUR_PATTERN.test(startTime) || !END_HOUR_PATTERN.test(dayHours.openTo)) {
    return false;
  }
  const endTime = addOneHour(startTime);
  return (
    timeToMinutes(startTime) >= timeToMinutes(dayHours.openFrom) &&
    timeToMinutes(endTime) <= timeToMinutes(dayHours.openTo)
  );
}

function resolveSlotPrice(priceList, dayOfWeek, startTime) {
  const basePrice = Number(priceList.basePrice ?? priceList.regularPrice);
  const hasPeak = Boolean(priceList.hasPeak);
  const peakDays = priceList.peakDays ?? [];
  const inPeak =
    hasPeak &&
    peakDays.map(Number).includes(dayOfWeek) &&
    timeToMinutes(priceList.peakFrom) <= timeToMinutes(startTime) &&
    timeToMinutes(startTime) < timeToMinutes(priceList.peakTo);

  return {
    price: inPeak ? Number(priceList.peakPrice) : basePrice,
    isPeak: inPeak,
  };
}

export {
  addOneHour,
  dayOfWeekFromDate,
  isSlotInPast,
  isWithinOpeningHours,
  resolveSlotPrice,
  timeToMinutes,
};
