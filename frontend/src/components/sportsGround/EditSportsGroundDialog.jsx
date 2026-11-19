import React from 'react';

import SportsGroundForm from './SportsGroundForm';
import { useSportsGround } from '../../providers/SportsGroundProvider';

// Úprava sportoviště v dialogu (obrazovka 5.4). Formulář je stejný jako
// při vytváření – backend u obou příkazů očekává stejná pole.
export default function EditSportsGroundDialog({ onClose }) {
  const { sportsGround, venue, update } = useSportsGround();

  async function handleSubmit(values) {
    await update(values);
    onClose();
  }

  return (
    <div
      className="sports-ground-modal-scrim"
      role="presentation"
      onClick={event => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="sports-ground-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Upravit sportoviště"
      >
        <div className="sports-ground-modal-header">
          <div>
            <h2>Upravit sportoviště</h2>
            {venue?.name && <p>{venue.name}</p>}
          </div>

          <button
            type="button"
            className="sports-ground-modal-close"
            onClick={onClose}
            aria-label="Zavřít"
          >
            ×
          </button>
        </div>

        <SportsGroundForm
          initialValues={{
            name: sportsGround.name,
            sportCode: sportsGround.sportCode ?? 'tennis',
            surface: sportsGround.surface,
            coverType: sportsGround.coverType
          }}
          submitLabel="Uložit změny"
          errorMessage="Sportoviště se nepodařilo upravit."
          onSubmit={handleSubmit}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
