import pool from "../db.js";

let ready;

async function tryAlter(sql) {
  try {
    await pool.execute(sql);
  } catch (e) {
    if (
      e.errno === 1060 ||
      e.errno === 1050 ||
      e.errno === 1061 ||
      e.code === "ER_DUP_FIELDNAME" ||
      e.code === "ER_DUP_KEYNAME" ||
      e.code === "ER_TABLE_EXISTS_ERROR"
    ) {
      return;
    }
    throw e;
  }
}

async function ensureSchema() {
  if (process.env.VENUE_MEMORY_DB === "1") return;
  if (ready) return ready;

  ready = (async () => {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS opening_hours (
        sportsGroundId CHAR(36) NOT NULL,
        dayOfWeek TINYINT NOT NULL,
        openFrom VARCHAR(5) NULL,
        openTo VARCHAR(5) NULL,
        isClosed BOOLEAN NOT NULL DEFAULT FALSE,
        PRIMARY KEY (sportsGroundId, dayOfWeek)
      )`);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS price_lists (
        sportsGroundId CHAR(36) PRIMARY KEY,
        regularPrice DECIMAL(8, 2) NOT NULL,
        peakPrice DECIMAL(8, 2) NULL,
        hasPeak BOOLEAN NOT NULL DEFAULT FALSE,
        peakDays VARCHAR(50) NULL,
        peakFrom VARCHAR(5) NULL,
        peakTo VARCHAR(5) NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`);

    await tryAlter("ALTER TABLE price_lists ADD COLUMN hasPeak BOOLEAN NOT NULL DEFAULT FALSE");
    await tryAlter("ALTER TABLE price_lists ADD COLUMN peakDays VARCHAR(50) NULL");
    await tryAlter("ALTER TABLE price_lists ADD COLUMN peakFrom VARCHAR(5) NULL");
    await tryAlter("ALTER TABLE price_lists ADD COLUMN peakTo VARCHAR(5) NULL");
    await tryAlter("ALTER TABLE venues ADD COLUMN streetNumber VARCHAR(20) NOT NULL DEFAULT '' AFTER street");
    await tryAlter("ALTER TABLE sports_grounds ADD UNIQUE KEY uq_sports_grounds_venue_name (venueId, name)");
  })();

  return ready;
}

export default ensureSchema;
