import React, { useEffect } from 'react';

import Icon from '../Icons';
import SportsGroundForm from './SportsGroundForm';

// Přidání sportoviště v dialogu (obrazovka 4.4). Název areálu v podtitulu
// dává provozovateli jistotu, do kterého areálu sportoviště zakládá.
export default function AddSportsGroundDialog({
  venueName,
  onCreate,
  onCreateAndNext,
  onClose
}) {
  useEffect(() => {
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
        aria-label="Přidat sportoviště"
      >
        <div className="sports-ground-modal-header">
          <div>
            <h2>Přidat sportoviště</h2>
            {venueName && <p>{venueName}</p>}
          </div>

          <button
            type="button"
            className="sports-ground-modal-close"
            onClick={onClose}
            aria-label="Zavřít"
          >
            <Icon name="close" size={24} />
          </button>
        </div>

        <SportsGroundForm
          submitLabel="Uložit"
          errorMessage="Sportoviště se nepodařilo vytvořit."
          onSubmit={onCreate}
          onSubmitAndNext={onCreateAndNext}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}