import mysql from "mysql2/promise";

const useMemory = process.env.VENUE_MEMORY_DB === "1";

const pool = useMemory
  ? {
      execute: async () => {
        throw new Error("MySQL pool is disabled while VENUE_MEMORY_DB=1");
      },
      getConnection: async () => {
        throw new Error("MySQL pool is disabled while VENUE_MEMORY_DB=1");
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
    });

export default pool;
