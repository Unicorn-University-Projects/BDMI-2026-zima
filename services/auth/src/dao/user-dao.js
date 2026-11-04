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

async function updateRole(id, role, termsAcceptedAt) {
  const [result] = await pool.execute(
    "UPDATE users SET role = ?, termsAcceptedAt = ? WHERE id = ? AND role IS NULL",
    [role, termsAcceptedAt, id],
  );
  if (result.affectedRows === 0) return null;
  return get(id);
}

async function updatePassword(id, passwordHash) {
  await pool.execute(
    `UPDATE users
     SET passwordHash = ?, passwordChangedAt = ?, passwordResetTokenHash = NULL, passwordResetExpiresAt = NULL
     WHERE id = ?`,
    [passwordHash, new Date(), id],
  );
  return get(id);
}

async function updatePasswordReset(id, passwordReset) {
  await pool.execute("UPDATE users SET passwordResetTokenHash = ?, passwordResetExpiresAt = ? WHERE id = ?", [
    passwordReset.tokenHash,
    passwordReset.expiresAt,
    id,
  ]);
  return get(id);
}

async function getByPasswordResetToken(tokenHash) {
  const [rows] = await pool.execute("SELECT * FROM users WHERE passwordResetTokenHash = ?", [tokenHash]);
  return rows[0] ?? null;
}

async function createWithAuthProvider(user, authProvider) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO users (id, email, firstName, surName, phoneNumber, role, termsAcceptedAt, passwordHash, passwordChangedAt)
       VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL)`,
      [user.id, user.email, user.firstName, user.surName],
    );
    await connection.execute(
      `INSERT INTO user_auth_providers (userId, provider, providerUserId, email, linkedAt)
       VALUES (?, ?, ?, ?, ?)`,
      [user.id, authProvider.provider, authProvider.providerUserId, authProvider.email, new Date()],
    );
    await connection.commit();
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
  return get(user.id);
}

async function getByAuthProvider(provider, providerUserId) {
  const [rows] = await pool.execute(
    `SELECT users.* FROM users
     JOIN user_auth_providers ON user_auth_providers.userId = users.id
     WHERE user_auth_providers.provider = ? AND user_auth_providers.providerUserId = ?`,
    [provider, providerUserId],
  );
  return rows[0] ?? null;
}

async function listAuthProviders(userId) {
  const [rows] = await pool.execute(
    "SELECT provider, email, linkedAt FROM user_auth_providers WHERE userId = ? ORDER BY linkedAt",
    [userId],
  );
  return rows;
}

export default {
  create,
  createWithAuthProvider,
  get,
  getByEmail,
  getByAuthProvider,
  getByPasswordResetToken,
  updateRole,
  updatePassword,
  updatePasswordReset,
  listAuthProviders,
};