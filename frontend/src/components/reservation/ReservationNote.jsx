import React from 'react';

import { NOTE_MAX_LENGTH, useReservation } from '../../providers/ReservationProvider';

// ==========================================
// POZNÁMKA PRO PROVOZOVATELE (obrazovka 1.4)
// ==========================================
//
// Nepovinné pole, backend ho omezuje na 200 znaků. Počítadlo sedí
// v pravém dolním rohu pole, proto má pole obal.

export default function ReservationNote() {
  const { note, setNote } = useReservation();

  return (
    <div className="reservation-field">
      <label htmlFor="reservation-note">Poznámka pro provozovatele (nepovinné)</label>

      <div className="reservation-textarea">
        <textarea
          id="reservation-note"
          value={note}
          maxLength={NOTE_MAX_LENGTH}
          rows={3}
          onChange={event => setNote(event.target.value)}
          aria-describedby="reservation-note-helper"
        />
        <span className="reservation-counter" aria-hidden="true">
          {note.length}/{NOTE_MAX_LENGTH}
        </span>
      </div>

      <small id="reservation-note-helper">Provozovatel ji uvidí u rezervace.</small>
    </div>
  );
}
