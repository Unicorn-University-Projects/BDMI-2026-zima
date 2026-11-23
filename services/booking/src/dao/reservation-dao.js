// Rezervace (tabulku reservations vlastní booking). Pro sloty stačí vědět,
// které sloty jsou obsazené: rezervace ve stavu "created" nebo "confirmed".
import pool, { useMemory } from "../db.js";
import memoryStore from "./memory-store.js";

const ACTIVE_STATES = ["created", "confirmed"];

function placeholders(list) {
  return list.map(() => "?").join(", ");
}

// startTime může být CHAR(5) "18:00" i TIME "18:00:00"
function mapRow(row) {
  return {
    sportsGroundId: row.sportsGroundId,
    date: String(row.date).slice(0, 10),
    startTime: String(row.startTime).slice(0, 5),
  };
}

// Aktivní rezervace více sportovišť v rozmezí dnů (dateFrom i dateTo včetně).
async function listActiveBySportsGroundListAndDateRange(sportsGroundIdList, dateFrom, dateTo) {
  if (sportsGroundIdList.length === 0) return [];
  if (useMemory) {
    return memoryStore.state.reservations
      .filter(
        (item) =>
          sportsGroundIdList.includes(item.sportsGroundId) &&
          item.date >= dateFrom &&
          item.date <= dateTo &&
          ACTIVE_STATES.includes(item.state),
      )
      .map(mapRow);
  }
  const [rows] = await pool.execute(
    `SELECT sportsGroundId, DATE_FORMAT(\`date\`, '%Y-%m-%d') AS \`date\`, startTime
     FROM reservations
     WHERE sportsGroundId IN (${placeholders(sportsGroundIdList)})
       AND \`date\` BETWEEN ? AND ?
       AND state IN ('created', 'confirmed')`,
    [...sportsGroundIdList, dateFrom, dateTo],
  );
  return rows.map(mapRow);
}

// Aktivní rezervace jednoho sportoviště pro jeden den (Application Model).
async function listActiveBySportsGroundAndDate(sportsGroundId, date) {
  return listActiveBySportsGroundListAndDateRange([sportsGroundId], date, date);
}

export default {
  listActiveBySportsGroundAndDate,
  listActiveBySportsGroundListAndDateRange,
};
