import React from 'react';
import { Link } from 'react-router-dom';

import Icon from '../Icons';
import { useReservation } from '../../providers/ReservationProvider';
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

export default function ReservationCreated() {
  const { reservation, sportsGround, venue, address } = useReservation();

  // "pá 27. 11." -> "Pá 27. 11."
  const shortDate = formatShortDate(reservation.date);
  const date = shortDate.charAt(0).toUpperCase() + shortDate.slice(1);

  const place = [venue?.name, address].filter(Boolean).join(' · ');

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
          <h2>{sportsGround?.name}</h2>

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
            /booking/reservation/listMine na backendu. */}
        <span
          className="ps-btn ps-btn-primary ps-btn-block disabled"
          role="button"
          aria-disabled="true"
          title="Moje rezervace budou doplněny"
        >
          Moje rezervace
        </span>

        <Link className="ps-btn ps-btn-outline ps-btn-block" to="/hledat">
          Hledat další
        </Link>
      </div>
    </div>
  );
}
