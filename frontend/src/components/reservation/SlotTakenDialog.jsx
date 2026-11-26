import React, { useEffect, useRef } from 'react';

import Icon from '../Icons';

// ==========================================
// TERMÍN UŽ NENÍ VOLNÝ (obrazovka 1.4-E)
// ==========================================
//
// Mezi zobrazením souhrnu a potvrzením může slot zabrat někdo jiný –
// backend to pozná podle unikátního indexu a vrátí 409
// reservation/create/slotUnavailable. Dialog je jediná cesta ven,
// proto nemá křížek: buď zpět na výběr termínu, nebo zavřít.

export default function SlotTakenDialog({ slotLabel, onPickAnother, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    // Fokus patří do dialogu, jinak by čtečka i klávesnice zůstaly
    // na tlačítku „Potvrdit rezervaci“ pod překryvem. Míří na celý
    // dialog, ne na tlačítko – jinak by se hned po otevření ukázal
    // fokusový rámeček, jako by uživatel tabem došel na „Zavřít“.
    dialogRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="reservation-modal-scrim"
      role="presentation"
      onClick={event => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="reservation-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="slot-taken-title"
        aria-describedby="slot-taken-text"
        ref={dialogRef}
        tabIndex={-1}
      >
        <span className="reservation-modal-icon" aria-hidden="true">
          <Icon name="warning" size={24} />
        </span>

        <h2 id="slot-taken-title">Termín už není volný</h2>

        <p id="slot-taken-text">
          {slotLabel ? `${slotLabel} si mezitím zarezervoval někdo jiný. ` : ''}
          Rezervace se nevytvořila.
        </p>

        <button
          type="button"
          className="reservation-btn-primary"
          onClick={onPickAnother}
        >
          Vybrat jiný čas
        </button>

        <button
          type="button"
          className="reservation-btn-outline"
          onClick={onClose}
        >
          Zavřít
        </button>
      </div>
    </div>
  );
}
