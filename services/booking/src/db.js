import mysql from "mysql2/promise";

// BOOKING_MEMORY_DB=1 – služba místo MySQL čte data z paměti (dao/memory-store.js).
// Slouží pro automatické testy a lokální spuštění bez databáze.
export const useMemory = process.env.BOOKING_MEMORY_DB === "1";

const pool = useMemory
  ? {
      execute: async () => {
        throw new Error("MySQL pool is disabled while BOOKING_MEMORY_DB=1");
      },
    }
  : mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectionLimit: 5,
      timezone: "Z",
      // DATE a TIME vracet jako text ("2026-11-23", "08:00:00"), ne jako Date –
      // sloty pracují s kalendářním dnem, ne s okamžikem v čase.
      dateStrings: true,
    });

export default pool;
