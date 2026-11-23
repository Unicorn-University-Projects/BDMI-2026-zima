// Aktuální čas pro výpočet slotů. Testy ho mohou nastavit na pevnou hodnotu,
// aby výsledky nezávisely na tom, kdy se spouští.

let fixedNow = null;

function now() {
  return fixedNow ? new Date(fixedNow) : new Date();
}

function setNow(value) {
  fixedNow = value == null ? null : new Date(value);
}

export default { now, setNow };
