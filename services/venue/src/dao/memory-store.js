const sports = [
  { id: "b0000000-0000-4000-8000-000000000001", code: "tennis", name: "Tenis" },
  { id: "b0000000-0000-4000-8000-000000000002", code: "badminton", name: "Badminton" },
  { id: "b0000000-0000-4000-8000-000000000003", code: "squash", name: "Squash" },
  { id: "b0000000-0000-4000-8000-000000000004", code: "volleyball", name: "Volejbal" },
  { id: "b0000000-0000-4000-8000-000000000005", code: "table_tennis", name: "Stolní tenis" },
];

const state = {
  venues: new Map(),
  sportsGrounds: new Map(),
  openingHours: new Map(),
  priceLists: new Map(),
};

function reset() {
  state.venues.clear();
  state.sportsGrounds.clear();
  state.openingHours.clear();
  state.priceLists.clear();
}

export default {
  sports,
  state,
  reset,
};
