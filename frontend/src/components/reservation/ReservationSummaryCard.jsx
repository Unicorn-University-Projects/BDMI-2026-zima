import React from 'react';

import Icon from '../Icons';
import KeyValueRow from '../common/KeyValueRow';
import BackLink from '../common/BackLink';

import { useReservation } from '../../providers/ReservationProvider';
import { formatPrice } from '../../utils/openingHours';
import { formatCancelDeadline, formatSummaryDate, formatTimeRange } from '../../utils/reservation';

// ==========================================
// KARTA SOUHRNU (obrazovka 1.4)
// ==========================================
//
// Co se rezervuje: sportoviště, areál, datum, čas a cena. Pod kartou
// stojí informace o tom, dokdy jde rezervaci zrušit.

export default function ReservationSummaryCard() {
  const { sportsGround, venue, address, date, startTime, price, isPeak } = useReservation();

  return (
    <>
      <BackLink to="/hledat" className="reservation-back">
        <Icon name="arrow" size={18} />
        Zpět na výběr termínu
      </BackLink>

      <h1 className="reservation-title">Souhrn rezervace</h1>

      <dl className="reservation-summary-card">
        <KeyValueRow label="Sportoviště" value={sportsGround?.name ?? '—'} />

        {/* Na úzké obrazovce se areál a adresa dělí na dva řádky,
            jinak by se dlouhá hodnota lámala přes půl karty. */}
        <KeyValueRow
          className="only-wide"
          label="Areál"
          value={[venue?.name, address].filter(Boolean).join(', ') || '—'}
        />
        <KeyValueRow className="only-narrow" label="Areál" value={venue?.name ?? '—'} />
        <KeyValueRow className="only-narrow" label="Adresa" value={address || '—'} />

        <KeyValueRow label="Datum" value={formatSummaryDate(date)} />
        <KeyValueRow label="Čas" value={formatTimeRange(startTime)} />

        <KeyValueRow
          strong
          label={isPeak ? 'Cena (špička)' : 'Cena'}
          value={price == null ? 'Nenastavena' : `${formatPrice(price)} · platba na místě`}
        />
      </dl>

      <p className="reservation-alert">
        <Icon name="info" size={20} />
        <span>
          Zrušit můžeš nejpozději 24 hodin před začátkem, tedy do{' '}
          {formatCancelDeadline(date, startTime)}.
        </span>
      </p>
    </>
  );
}
