import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { createReservation } from '../calls/reservations';
import { getSportsGround, getVenue } from '../calls/venues';

import {
  dayOfWeekFromIsoDate,
  formatSummaryDate,
  formatTimeRange,
  formatVenueAddress,
  isSlotInPast,
  isWithinOpeningHours,
  resolveSlotPrice
} from '../utils/reservation';

// ==========================================
// PROVIDER REZERVACE (BUC-02, obrazovky 1.4, 1.4-E a 1.5)
// ==========================================
//
// Prostřední vrstva: drží data z calls, stavy načítání a chyb, odvozené
// hodnoty i akce. Obrazovka a komponenty pod ní už jen zobrazují, co jim
// provider podá – nevolají API a nepočítají nic z dat.

export const NOTE_MAX_LENGTH = 200;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const START_TIME_PATTERN = /^([01]\d|2[0-3]):00$/;

// Chybové kódy backendu přeložené do věty, která uživateli něco řekne.
// slotUnavailable tu není schválně – na ten se otevírá dialog 1.4-E.
const ERROR_MESSAGES = {
  'reservation/create/slotInPast': 'Tenhle termín už začal. Vyber jiný.',
  'reservation/create/outsideOpeningHours':
    'Zvolený čas je mimo otevírací dobu sportoviště.',
  'reservation/create/sportsGroundNotAvailable':
    'Sportoviště se už nenabízí k rezervaci.',
  'reservation/invalidDtoIn': 'Termín rezervace není platný.',
  'user/forbidden': 'Rezervovat může jen přihlášený sportovec.'
};

const ReservationContext = createContext(null);

export function useReservation() {
  const context = useContext(ReservationContext);
  if (!context) {
    throw new Error('useReservation musí být uvnitř ReservationProvider.');
  }
  return context;
}

export default function ReservationProvider({ sportsGroundId, date, startTime, children }) {
  const paramsValid =
    UUID_PATTERN.test(sportsGroundId ?? '') &&
    DATE_PATTERN.test(date ?? '') &&
    START_TIME_PATTERN.test(startTime ?? '');

  const [sportsGround, setSportsGround] = useState(null);
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(paramsValid);
  const [loadError, setLoadError] = useState(
    paramsValid ? '' : 'Odkaz na rezervaci je neúplný. Vyber termín znovu ve vyhledávání.'
  );

  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [slotTaken, setSlotTaken] = useState(false);
  const [reservation, setReservation] = useState(null);

  useEffect(() => {
    if (!paramsValid) {
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError('');

    // Areál se dotahuje až podle venueId ze sportoviště, proto dva kroky.
    getSportsGround(sportsGroundId)
      .then(async loaded => {
        const parent = loaded.venueId ? await getVenue(loaded.venueId) : null;
        if (!cancelled) {
          setSportsGround(loaded);
          setVenue(parent);
        }
      })
      .catch(e => {
        if (!cancelled) {
          setLoadError(
            e.status === 404 ? 'Sportoviště se už nenabízí k rezervaci.' : e.message
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [paramsValid, sportsGroundId]);

  async function confirm() {
    setSubmitting(true);
    setSubmitError('');

    try {
      setReservation(await createReservation({ sportsGroundId, date, startTime, note }));
    } catch (e) {
      if (e.code === 'reservation/create/slotUnavailable') {
        setSlotTaken(true);
      } else {
        setSubmitError(ERROR_MESSAGES[e.code] ?? e.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const value = useMemo(() => {
    // Cena se počítá stejně jako na backendu, ať souhrn nelže.
    const dayOfWeek = paramsValid ? dayOfWeekFromIsoDate(date) : null;
    const { price, isPeak } = sportsGround
      ? resolveSlotPrice(sportsGround.priceList, dayOfWeek, startTime)
      : { price: null, isPeak: false };

    const inPast = paramsValid && isSlotInPast(date, startTime);
    const open =
      Boolean(sportsGround) && isWithinOpeningHours(sportsGround.openingHours, dayOfWeek, startTime);

    // Co by backend stejně odmítl, nemá smysl posílat.
    let blockingMessage = '';
    if (sportsGround) {
      if (inPast) blockingMessage = 'Tenhle termín už začal. Vyber jiný.';
      else if (!open) blockingMessage = 'Zvolený čas je mimo otevírací dobu sportoviště.';
      else if (price == null) blockingMessage = 'Sportoviště nemá nastavený ceník, rezervovat zatím nejde.';
    }

    return {
      date,
      startTime,
      sportsGround,
      venue,
      address: formatVenueAddress(venue),
      loading,
      loadError,
      price,
      isPeak,
      blockingMessage,
      slotLabel: paramsValid ? `${formatSummaryDate(date)} ${formatTimeRange(startTime)}` : '',
      note,
      setNote,
      submitting,
      submitError,
      confirm,
      reservation,
      slotTaken,
      dismissSlotTaken: () => setSlotTaken(false)
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    paramsValid, date, startTime, sportsGround, venue, loading, loadError,
    note, submitting, submitError, reservation, slotTaken
  ]);

  return (
    <ReservationContext.Provider value={value}>
      {children}
    </ReservationContext.Provider>
  );
}
