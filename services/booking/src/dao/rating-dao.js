// Průměrné hodnocení sportovišť. Služba review zatím neexistuje, proto se průměr
// počítá přímo z tabulky ratings (Application Model počítá s uloženým
// SportsGround.averageRating, ten zatím nikdo neplní).
import pool, { useMemory } from "../db.js";
import memoryStore from "./memory-store.js";

function placeholders(list) {
  return list.map(() => "?").join(", ");
}

function toSummary(rows) {
  const summary = new Map();
  for (const row of rows) {
    summary.set(row.sportsGroundId, {
      // Jedno desetinné místo, stejně jako SportsGround.averageRating.
      averageRating: Math.round(Number(row.averageRating) * 10) / 10,
      ratingCount: Number(row.ratingCount),
    });
  }
  return summary;
}

/**
 * @returns {Promise<Map<string, {averageRating: number, ratingCount: number}>>}
 *   Sportoviště bez hodnocení v mapě nejsou.
 */
async function getSummaryBySportsGroundList(sportsGroundIdList) {
  if (sportsGroundIdList.length === 0) return new Map();

  if (useMemory) {
    const rows = sportsGroundIdList
      .map((sportsGroundId) => {
        const stars = memoryStore.state.ratings
          .filter((item) => item.sportsGroundId === sportsGroundId)
          .map((item) => item.stars);
        if (stars.length === 0) return null;
        return {
          sportsGroundId,
          averageRating: stars.reduce((sum, value) => sum + value, 0) / stars.length,
          ratingCount: stars.length,
        };
      })
      .filter(Boolean);
    return toSummary(rows);
  }

  try {
    // Schéma podle Application Modelu: ratings.sportsGroundId, ratings.stars
    const [rows] = await pool.execute(
      `SELECT sportsGroundId, AVG(stars) AS averageRating, COUNT(*) AS ratingCount
       FROM ratings
       WHERE sportsGroundId IN (${placeholders(sportsGroundIdList)})
       GROUP BY sportsGroundId`,
      sportsGroundIdList,
    );
    return toSummary(rows);
  } catch (e) {
    if (e.code === "ER_NO_SUCH_TABLE") return new Map();
    if (e.code !== "ER_BAD_FIELD_ERROR") throw e;
  }

  // Starší schéma sdílené DB: ratings.rating, sportoviště přes rezervaci.
  const [rows] = await pool.execute(
    `SELECT r.sportsGroundId, AVG(rt.rating) AS averageRating, COUNT(*) AS ratingCount
     FROM ratings rt
     JOIN reservations r ON r.id = rt.reservationId
     WHERE r.sportsGroundId IN (${placeholders(sportsGroundIdList)})
     GROUP BY r.sportsGroundId`,
    sportsGroundIdList,
  );
  return toSummary(rows);
}

export default {
  getSummaryBySportsGroundList,
};
