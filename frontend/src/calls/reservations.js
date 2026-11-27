import { apiFetch } from './api';

// ==========================================
// REZERVACE (BUC-02, obrazovky 1.4, 1.4-E a 1.5)
// ==========================================
//
// Booking služba umí zatím jen vytvoření rezervace. Seznam vlastních
// rezervací (/booking/reservation/listMine) a detail sem přibydou,
// až budou obrazovky 2.x.

function mapReservation(reservation) {
  return {
    id: reservation.id,
    sportsGroundId: reservation.sportsGroundId,
    athleteId: reservation.athleteId,
    date: reservation.date,
    startTime: reservation.startTime,
    endTime: reservation.endTime,
    price: reservation.price == null ? null : Number(reservation.price),
    isPeak: Boolean(reservation.isPeak),
    note: reservation.note ?? '',
    state: reservation.state,
    createdAt: reservation.createdAt,
    updatedAt: reservation.updatedAt
  };
}

// Vytvoří rezervaci. Při obsazeném termínu vyhodí chybu s kódem
// reservation/create/slotUnavailable (HTTP 409) – obrazovka na ni
// reaguje dialogem 1.4-E.
export async function createReservation({ sportsGroundId, date, startTime, note }) {
  const dtoOut = await apiFetch('/booking/reservation/create', {
    method: 'POST',
    body: JSON.stringify({
      sportsGroundId,
      date,
      startTime,
      // Prázdnou poznámku neposíláme, backend ji má jako nepovinnou.
      ...(note?.trim() ? { note: note.trim() } : {})
    })
  });

  return mapReservation(dtoOut.reservation);
}
