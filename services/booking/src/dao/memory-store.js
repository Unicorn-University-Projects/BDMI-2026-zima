const state = {
  reservations: new Map(),
};

function reset() {
  state.reservations.clear();
}

export default {
  state,
  reset,
};
