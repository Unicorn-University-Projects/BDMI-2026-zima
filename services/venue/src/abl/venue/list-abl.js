import venueDao from "../../dao/venue-dao.js";

async function listAbl(req, res) {
  try {
    const operatorId = req.get("X-User-Id");
    if (!operatorId) {
      return res.status(401).json({
        code: "user/unauthenticated",
        message: "Uživatel není přihlášený.",
        params: {},
      });
    }

    const role = req.get("X-User-Role");
    if (role !== "operator") {
      return res.status(403).json({
        code: "user/forbidden",
        message: "Akce je dostupná pouze pro provozovatele.",
        params: { role },
      });
    }

    const itemList = await venueDao.listByOperatorId(operatorId);
    return res.json({ itemList });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      code: "venue/list/failed",
      message: "Načtení areálů se nezdařilo.",
      params: {},
    });
  }
}

export default listAbl;
