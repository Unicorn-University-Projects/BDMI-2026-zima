import React from 'react';

import Icon from '../Icons';
import { cityLocative, formatLongDateAccusative, formatShortDate } from '../../utils/searchParams';

// ==========================================
// ŽÁDNÉ VOLNÉ SPORTOVIŠTĚ (1.2-A1)
// ==========================================
//
// Kromě sdělení nabízí i cestu dál: nejbližší volný den a širší okolí.
// Obojí jen přepíše kritéria v URL.

export default function NoFreeSportsGround({
  datum,
  lokalita,
  nextFreeDate,
  onPickDate,
  onWiderArea
}) {
  // Bez známého 6. pádu raději větu bez názvu města než „v Praha“.
  const mesto = cityLocative(lokalita);
  const kde = mesto ? ` v ${mesto}` : '';

  return (
    <section className="search-empty">
      <span className="search-empty-icon">
        <Icon name="calendar" size={28} />
      </span>

      <h2>Na {formatLongDateAccusative(datum)} je{kde} vše obsazeno</h2>

      <p>
        Pro zadaná kritéria teď není volné žádné sportoviště.
        Zkus jiný den nebo širší okolí.
      </p>

      <div className="search-empty-actions">
        {nextFreeDate && (
          <button
            type="button"
            className="search-submit"
            onClick={() => onPickDate(nextFreeDate)}
          >
            <Icon name="calendar" size={18} />
            Nejbližší volno: {formatShortDate(nextFreeDate)}
          </button>
        )}

        {lokalita && (
          <button
            type="button"
            className="search-btn-outline"
            onClick={onWiderArea}
          >
            <Icon name="pin" size={18} />
            {mesto ? `Hledat v ${mesto} a okolí` : 'Hledat v širším okolí'}
          </button>
        )}
      </div>
    </section>
  );
}