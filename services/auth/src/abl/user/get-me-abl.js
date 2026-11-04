import userDao from "../../dao/user-dao.js";

async function getMeAbl(req, res) {
  try {
    const userId = req.get("X-User-Id");
    if (!userId) {
      return res.status(401).json({
        code: "user/unauthenticated",
        message: "Uživatel není přihlášený.",
        params: {},
      });
    }

    const user = await userDao.get(userId);
    if (!user) {
      return res.status(404).json({
        code: "user/notFound",
        message: "Uživatel neexistuje.",
        params: { userId },
      });
    }
    const authProviders = await userDao.listAuthProviders(userId);

    const dtoOut = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      surName: user.surName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      termsAcceptedAt: user.termsAcceptedAt,
      notificationSettings: user.notificationSettings,
      hasPassword: user.passwordHash !== null,
      passwordChangedAt: user.passwordChangedAt,
      authProviders,
    };
    return res.json(dtoOut);
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      code: "user/getMe/failed",
      message: "Načtení uživatele se nezdařilo.",
      params: {},
    });
  }
}

export default getMeAbl;
