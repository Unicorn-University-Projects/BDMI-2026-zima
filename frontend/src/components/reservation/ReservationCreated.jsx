import React from 'react';
import { Link } from 'react-router-dom';

import Icon from '../Icons';
import { formatPrice } from '../../utils/openingHours';
import { formatShortDate } from '../../utils/searchParams';
import { formatTimeRange } from '../../utils/reservation';

// ==========================================
// REZERVACE VYTVOŘENA (obrazovka 1.5)
// ==========================================
//
// Rezervace vzniká ve stavu „created“, tedy čeká na provozovatele.
// Obrazovka to říká rovnou, ať uživatel nečeká okamžité potvrzení.

const STATE_LABELS = {
  created: 'Čeká na potvrzení',
  confirmed: 'Potvrzeno',
  cancelled: 'Zrušeno',
  completed: 'Proběhlo'
};

export default function ReservationCreated({ reservation, sportsGroundName, venueName, address }) {
  // "út 3. 11." -> "Út 3. 11."
  const shortDate = formatShortDate(reservation.date);
  const date = shortDate.charAt(0).toUpperCase() + shortDate.slice(1);

  const place = [venueName, address].filter(Boolean).join(' · ');

  return (
    <div className="reservation-done">
      <span className="reservation-done-check" aria-hidden="true">
        <Icon name="checkPlain" size={34} />
      </span>

      <h1>Rezervace vytvořena</h1>

      <p className="reservation-done-note">
        Čeká na potvrzení provozovatelem. Stav uvidíš v Mých rezervacích.
      </p>

      <div className="reservation-done-card">
        <div className="reservation-done-card-head">
          <h2>{sportsGroundName}</h2>

          <span className="reservation-state-badge">
            {STATE_LABELS[reservation.state] ?? reservation.state}
          </span>
        </div>

        {place && <p className="reservation-done-place">{place}</p>}

        <ul className="reservation-done-facts">
          <li>
            <Icon name="calendar" size={16} />
            {date}
          </li>
          <li>
            <Icon name="clock" size={16} />
            {formatTimeRange(reservation.startTime)}
          </li>
          <li>
            <Icon name="tag" size={16} />
            {formatPrice(reservation.price)}
          </li>
        </ul>
      </div>

      <div className="reservation-done-actions">
        {/* Obrazovka 2.1 Moje rezervace zatím není, stejně jako
            /booking/reservation/listMine na frontendu. */}
        <span
          className="reservation-btn-primary disabled"
          role="button"
          aria-disabled="true"
          title="Moje rezervace budou doplněny"
        >
          Moje rezervace
        </span>

        <Link className="reservation-btn-outline" to="/hledat">
          Hledat další
        </Link>
      </div>
    </div>
  );
}
