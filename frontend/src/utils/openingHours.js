// ==========================================
// OTEVÍRACÍ DOBA A CENÍK – POMOCNÉ FUNKCE
// ==========================================
//
// Backend posílá otevírací dobu jako pole sedmi dnů, kde dayOfWeek 1 = pondělí
// a 7 = neděle (stejné pořadí má formulář v návrhu, sekce F5).
// Zavřený den má openFrom i openTo null.

const DAY_NAMES = ['pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota', 'neděle'];
const DAY_SHORT = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

const MONDAY_BASED = day => ((day + 6) % 7) + 1;

// Zkratka dne, na začátku souhrnu s velkým písmenem, dál malým.
function dayShort(dayOfWeek, capitalize) {
  const name = DAY_SHORT[dayOfWeek - 1] ?? '';
  return capitalize ? name : name.toLowerCase();
}

// "08:00" -> "8:00"
export function formatTime(value) {
  if (!value) {
    return '';
  }
  const [hours, minutes] = value.split(':');
  return `${Number(hours)}:${minutes}`;
}

// "17:00" -> "17" (ve špičce se minuty nezobrazují)
export function formatHour(value) {
  return value ? String(Number(value.split(':')[0])) : '';
}

export function formatPrice(value) {
  return value == null ? '' : `${Number(value)} Kč`;
}

export function dayName(dayOfWeek) {
  return DAY_NAMES[dayOfWeek - 1] ?? '';
}

// Seřadí dny a doplní chybějící, ať se na vstup dá spolehnout.
function normalizeDays(openingHours = []) {
  return Array.from({ length: 7 }, (unused, index) => {
    const dayOfWeek = index + 1;
    const found = openingHours.find(day => Number(day.dayOfWeek) === dayOfWeek);
    if (!found || found.isClosed || !found.openFrom || !found.openTo) {
      return { dayOfWeek, isClosed: true, openFrom: null, openTo: null };
    }
    return {
      dayOfWeek,
      isClosed: false,
      openFrom: found.openFrom,
      openTo: found.openTo
    };
  });
}

// Spojí sousední dny se stejnou hodnotou do úseků: Po,Út,St se stejnou dobou
// dá jeden úsek "Po–st".
function groupConsecutive(days, signature) {
  const groups = [];

  days.forEach(day => {
    const key = signature(day);
    const last = groups[groups.length - 1];

    if (last && last.key === key && day.dayOfWeek === last.to + 1) {
      last.to = day.dayOfWeek;
    } else {
      groups.push({ key, from: day.dayOfWeek, to: day.dayOfWeek, day });
    }
  });

  return groups;
}

function groupLabel(group, capitalize) {
  if (group.from === group.to) {
    return dayShort(group.from, capitalize);
  }
  return `${dayShort(group.from, capitalize)}–${dayShort(group.to, false)}`;
}

// "Po–so 8:00–22:00 · ne zavřeno"
export function summarizeOpeningHours(openingHours) {
  const days = normalizeDays(openingHours);

  if (days.every(day => day.isClosed)) {
    return 'Zatím nenastaveno';
  }

  const groups = groupConsecutive(days, day =>
    day.isClosed ? 'closed' : `${day.openFrom}-${day.openTo}`
  );

  return groups
    .map((group, index) => {
      const label = groupLabel(group, index === 0);
      if (group.day.isClosed) {
        return `${label} zavřeno`;
      }
      return `${label} ${formatTime(group.day.openFrom)}–${formatTime(group.day.openTo)}`;
    })
    .join(' · ');
}

// "Po–pá 17–21 · 450 Kč"
export function summarizePeak(priceList) {
  if (!priceList?.hasPeak || !priceList.peakDays?.length) {
    return 'Bez špičky';
  }

  const days = [...priceList.peakDays].sort((a, b) => a - b).map(dayOfWeek => ({ dayOfWeek }));
  const groups = groupConsecutive(days, () => 'peak');
  const labels = groups.map((group, index) => groupLabel(group, index === 0)).join(', ');
  const time = `${formatHour(priceList.peakFrom)}–${formatHour(priceList.peakTo)}`;

  return `${labels} ${time} · ${formatPrice(priceList.peakPrice)}`;
}

// Den, na který se ukazuje náhled: dnešek, a pokud je zavřeno, nejbližší
// otevřený den.
export function findPreviewDate(openingHours, today = new Date()) {
  const days = normalizeDays(openingHours);

  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    const dayOfWeek = MONDAY_BASED(date.getDay());

    if (!days[dayOfWeek - 1].isClosed) {
      return date;
    }
  }

  return null;
}

// "úterý 3. 11."
export function formatPreviewDate(date) {
  if (!date) {
    return '';
  }
  const dayOfWeek = MONDAY_BASED(date.getDay());
  return `${dayName(dayOfWeek)} ${date.getDate()}. ${date.getMonth() + 1}.`;
}

// Hodinové sloty podle otevírací doby daného dne. Cena ve špičce platí pro
// sloty, které ve špičce začínají.
export function buildSlots(openingHours, priceList, date) {
  if (!date || !priceList) {
    return [];
  }

  const dayOfWeek = MONDAY_BASED(date.getDay());
  const day = normalizeDays(openingHours)[dayOfWeek - 1];

  if (day.isClosed) {
    return [];
  }

  const from = Number(day.openFrom.split(':')[0]);
  const to = Number(day.openTo.split(':')[0]);

  const peakActive = Boolean(priceList.hasPeak) && (priceList.peakDays ?? []).includes(dayOfWeek);
  const peakFrom = peakActive ? Number(priceList.peakFrom.split(':')[0]) : null;
  const peakTo = peakActive ? Number(priceList.peakTo.split(':')[0]) : null;

  const slots = [];

  for (let hour = from; hour < to; hour += 1) {
    const isPeak = peakActive && hour >= peakFrom && hour < peakTo;
    slots.push({
      hour,
      time: `${hour}:00`,
      isPeak,
      price: isPeak ? priceList.peakPrice : priceList.regularPrice
    });
  }

  return slots;
}