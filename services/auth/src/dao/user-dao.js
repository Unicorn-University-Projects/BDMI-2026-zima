import pool from "../db.js";

async function create(user) {
  await pool.execute(
    `INSERT INTO users (id, email, firstName, surName, phoneNumber, role, termsAcceptedAt, passwordHash, passwordChangedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user.id,
      user.email,
      user.firstName,
      user.surName,
      user.phoneNumber,
      user.role,
      user.termsAcceptedAt,
      user.passwordHash,
      user.passwordChangedAt,
    ],
  );
  return get(user.id);
}

async function get(id) {
  const [rows] = await pool.execute("SELECT * FROM users WHERE id = ?", [id]);
  return rows[0] ?? null;
}

async function getByEmail(email) {
  const [rows] = await pool.execute("SELECT * FROM users WHERE email = ?", [email.toLowerCase()]);
  return rows[0] ?? null;
}

export default { create, get, getByEmail };