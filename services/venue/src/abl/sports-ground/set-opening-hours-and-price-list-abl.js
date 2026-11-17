import sportsGroundDao from "../../dao/sports-ground-dao.js";
import venueDao from "../../dao/venue-dao.js";
import { sportsGroundInvalidDtoIn, trimDtoIn } from "../../utils/validation.js";
import { validateOpeningHoursAndPriceList } from "../../utils/opening-hours.js";

function toNumber(value) {
  if (value == null || value === "") return value;
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}

function normalizeDtoIn(body = {}) {
  const dtoIn = trimDtoIn(body);
  const nestedPriceList = typeof dtoIn.priceList === "object" && dtoIn.priceList ? dtoIn.priceList : {};
  const priceList = trimDtoIn({
    basePrice: nestedPriceList.basePrice ?? dtoIn.basePrice ?? nestedPriceList.regularPrice ?? dtoIn.regularPrice,
    regularPrice: nestedPriceList.regularPrice ?? dtoIn.regularPrice ?? nestedPriceList.basePrice ?? dtoIn.basePrice,
    hasPeak: nestedPriceList.hasPeak ?? dtoIn.hasPeak ?? false,
    peakPrice: nestedPriceList.peakPrice ?? dtoIn.peakPrice,
    peakDays: nestedPriceList.peakDays ?? dtoIn.peakDays ?? [],
    peakFrom: nestedPriceList.peakFrom ?? dtoIn.peakFrom,
    peakTo: nestedPriceList.peakTo ?? dtoIn.peakTo,
  });
  priceList.basePrice = toNumber(priceList.basePrice);
  priceList.regularPrice = toNumber(priceList.regularPrice);
  priceList.peakPrice = toNumber(priceList.peakPrice);
  if (typeof priceList.hasPeak === "string") {
    priceList.hasPeak = priceList.hasPeak === "true" || priceList.hasPeak === "1";
  }

  return {
    sportsGroundId: dtoIn.sportsGroundId ?? dtoIn.id,
    openingHours: dtoIn.openingHours,
    priceList,
  };
}

async function setOpeningHoursAndPriceListAbl(req, res) {
  try {
    const userId = req.get("X-User-Id");
    if (!userId) {
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

    const dtoIn = normalizeDtoIn(req.body ?? {});
    if (!dtoIn.sportsGroundId || typeof dtoIn.sportsGroundId !== "string") {
      return res.status(400).json(sportsGroundInvalidDtoIn([{ params: { missingProperty: "sportsGroundId" } }]));
    }

    const sportsGround = await sportsGroundDao.get(dtoIn.sportsGroundId);
    if (!sportsGround) {
      return res.status(404).json({
        code: "sportsGround/notFound",
        message: "Sportoviště neexistuje.",
        params: { id: dtoIn.sportsGroundId },
      });
    }

    const venue = await venueDao.get(sportsGround.venueId);
    if (!venue || venue.operatorId !== userId) {
      return res.status(403).json({
        code: "user/forbidden",
        message: "Otevírací dobu a ceník může nastavit jen provozovatel areálu.",
        params: {},
      });
    }

    const validated = validateOpeningHoursAndPriceList(dtoIn);
    if (validated.code) {
      return res.status(400).json(validated);
    }

    const updated = await sportsGroundDao.setOpeningHoursAndPriceList(sportsGround.id, {
      openingHours: validated.openingHours,
      priceList: validated.priceList,
    });

    return res.json({ sportsGround: updated });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      code: "sportsGround/setOpeningHoursAndPriceList/failed",
      message: "Uložení otevírací doby a ceníku se nezdařilo.",
      params: {},
    });
  }
}

export default setOpeningHoursAndPriceListAbl;
