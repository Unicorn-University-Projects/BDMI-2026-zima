const permissions = {
  "auth/user/register": ["Public"],
  "auth/user/signIn": ["Public"],
  "auth/user/signInWithProvider": ["Public"],
  "auth/user/requestPasswordReset": ["Public"],
  "auth/user/resetPassword": ["Public"],
  "auth/user/getMe": ["Authenticated"],
  "auth/user/setRole": ["Authenticated"],
  "auth/user/setPassword": ["Authenticated"],
  "auth/user/update": ["Authenticated"],

  "venue/venue/create": ["Operator"],
  "venue/venue/list": ["Operator"],
  "venue/venue/get": ["Authenticated"],
  "venue/venue/update": ["Operator", "Admin"],
  "venue/venue/delete": ["Operator", "Admin"],
  "venue/sportsGround/create": ["Operator"],
  "venue/sportsGround/list": ["Authenticated"],
  "venue/sportsGround/get": ["Authenticated"],
  "venue/sportsGround/update": ["Operator"],
  "venue/sportsGround/addPhoto": ["Operator"],
  "venue/sportsGround/deletePhoto": ["Operator"],
  "venue/sportsGround/setPhotoOrder": ["Operator"],
  "venue/sportsGround/delete": ["Operator"],
  "venue/sportsGround/setOpeningHoursAndPriceList": ["Operator"],

  "booking/sportsGround/search": ["Athlete"],
  "booking/sportsGround/getAvailability": ["Authenticated"],
  "booking/reservation/create": ["Athlete"],
  "booking/reservation/cancel": ["Athlete", "Operator"],
  "booking/reservation/get": ["Athlete", "Operator"],
  "booking/reservation/complete": ["System"],
  "booking/reservation/confirm": ["Operator"],
  "booking/reservation/reject": ["Operator"],
  "booking/reservation/listMine": ["Athlete"],
  "booking/reservation/listByVenue": ["Operator"],

  "review/rating/create": ["Athlete"],
  "review/rating/list": ["Authenticated"],

  "audit/audit/create": ["System"],
};

const roleNotSetAllowed = ["auth/user/getMe", "auth/user/setRole"];

const roleProfiles = {
  athlete: "Athlete",
  operator: "Operator",
  admin: "Admin",
};

const services = {
  auth: process.env.AUTH_URL || "http://127.0.0.1:4001",
  venue: process.env.VENUE_URL || "http://127.0.0.1:4002",
  booking: process.env.BOOKING_URL || "http://127.0.0.1:4003",
  review: process.env.REVIEW_URL || "http://127.0.0.1:4004",
};

function getCommandPath(req) {
  return req.path.replace(/^\/+|\/+$/g, "");
}

function getProfiles(commandPath) {
  return Object.hasOwn(permissions, commandPath) ? permissions[commandPath] : null;
}

export default { permissions, roleNotSetAllowed, roleProfiles, services, getCommandPath, getProfiles };
