import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import AthleteTopBar from '../../components/athlete/AthleteTopBar';
import BackLink from '../../components/common/BackLink';
import Icon from '../../components/Icons';
import ReservationCreated from '../../components/reservation/ReservationCreated';
import SlotTakenDialog from '../../components/reservation/SlotTakenDialog';
import SummaryRow from '../../components/reservation/SummaryRow';

import CurrentUserProvider from '../../providers/CurrentUserProvider';

import { createReservation } from '../../calls/reservations';
import { getSportsGround, getVenue } from '../../calls/venues';
import { formatPrice } from '../../utils/openingHours';
import {
  dayOfWeekFromIsoDate,
  formatCancelDeadline,
  formatSummaryDate,
  formatTimeRange,
  formatVenueAddress,
  isSlotInPast,
  isWithinOpeningHours,
  resolveSlotPrice
} from '../../utils/reservation';

import '../../styles/search.css';
import '../../styles/reservation.css';

// ==========================================
// SOUHRN REZERVACE (BUC-02, obrazovky 1.4, 1.4-E a 1.5)
// ==========================================
//
// Co se rezervuje, drží adresa – sportoviště, den a hodina. Díky tomu
// obrazovka přežije obnovení stránky i otevření odkazu napřímo a
// nepotřebuje stav z předchozí obrazovky:
//   /rezervace/nova?sportoviste=<uuid>&datum=2026-11-03&cas=17:00
//
// Výběr termínu (obrazovka 1.3 Detail sportoviště) dělá někdo jiný.
// Až vznikne, stačí z vybraného slotu odkázat sem:
//   /rezervace/nova?sportoviste=${sportsGround.id}&datum=${isoDate}&cas=${startTime}
// kde isoDate je YYYY-MM-DD a startTime celá hodina HH:00. Nic jiného
// tahle obrazovka nepotřebuje, zbytek si dotáhne z backendu sama.

const NOTE_MAX_LENGTH = 200;

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

function ReservationSummaryContent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const sportsGroundId = searchParams.get('sportoviste') ?? '';
  const date = searchParams.get('datum') ?? '';
  const startTime = searchParams.get('cas') ?? '';

  const paramsValid =
    UUID_PATTERN.test(sportsGroundId) &&
    DATE_PATTERN.test(date) &&
    START_TIME_PATTERN.test(startTime);

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
        const loadedVenue = loaded.venueId ? await getVenue(loaded.venueId) : null;
        if (!cancelled) {
          setSportsGround(loaded);
          setVenue(loadedVenue);
        }
      })
      .catch(error => {
        if (!cancelled) {
          setLoadError(
            error.status === 404
              ? 'Sportoviště se už nenabízí k rezervaci.'
              : error.message
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

  // Cena se počítá stejně jako na backendu, ať souhrn nelže.
  const slot = useMemo(() => {
    if (!sportsGround || !paramsValid) {
      return null;
    }

    const dayOfWeek = dayOfWeekFromIsoDate(date);
    const { price, isPeak } = resolveSlotPrice(sportsGround.priceList, dayOfWeek, startTime);

    return {
      price,
      isPeak,
      inPast: isSlotInPast(date, startTime),
      open: isWithinOpeningHours(sportsGround.openingHours, dayOfWeek, startTime)
    };
  }, [sportsGround, paramsValid, date, startTime]);

  // Co by backend stejně odmítl, nemá smysl posílat.
  const blockingMessage = (() => {
    if (!slot) return '';
    if (slot.inPast) return 'Tenhle termín už začal. Vyber jiný.';
    if (!slot.open) return 'Zvolený čas je mimo otevírací dobu sportoviště.';
    if (slot.price == null) return 'Sportoviště nemá nastavený ceník, rezervovat zatím nejde.';
    return '';
  })();

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting || blockingMessage) {
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const created = await createReservation({ sportsGroundId, date, startTime, note });
      setReservation(created);
    } catch (error) {
      if (error.code === 'reservation/create/slotUnavailable') {
        setSlotTaken(true);
      } else {
        setSubmitError(ERROR_MESSAGES[error.code] ?? error.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const address = formatVenueAddress(venue);
  const slotLabel = paramsValid
    ? `${formatSummaryDate(date)} ${formatTimeRange(startTime)}`
    : '';

  // ---------- 1.5 Rezervace vytvořena ----------

  if (reservation) {
    return (
      <div className="reservation-page">
        <AthleteTopBar active="hledat" />

        <div className="reservation-content">
          <ReservationCreated
            reservation={reservation}
            sportsGroundName={sportsGround?.name}
            venueName={venue?.name}
            address={address}
          />
        </div>
      </div>
    );
  }

  // ---------- 1.4 Souhrn rezervace ----------

  return (
    <div className="reservation-page">
      <AthleteTopBar active="hledat" />

      <div className="reservation-content">
        <BackLink to="/hledat" className="reservation-back">
          <Icon name="arrow" size={18} />
          Zpět na výběr termínu
        </BackLink>

        <h1 className="reservation-title">Souhrn rezervace</h1>

        {loading && <p className="reservation-message">Načítám sportoviště…</p>}

        {!loading && loadError && (
          <p className="reservation-message">
            <span className="reservation-error" role="alert">{loadError}</span>
          </p>
        )}

        {!loading && !loadError && sportsGround && (
          <form onSubmit={handleSubmit} noValidate>
            <dl className="reservation-summary-card">
              <SummaryRow label="Sportoviště" value={sportsGround.name} />

              {/* Na úzké obrazovce se areál a adresa dělí na dva řádky,
                  jinak by se dlouhá hodnota lámala přes půl karty. */}
              <SummaryRow
                className="only-wide"
                label="Areál"
                value={[venue?.name, address].filter(Boolean).join(', ')}
              />
              <SummaryRow className="only-narrow" label="Areál" value={venue?.name ?? '—'} />
              <SummaryRow className="only-narrow" label="Adresa" value={address || '—'} />

              <SummaryRow label="Datum" value={formatSummaryDate(date)} />
              <SummaryRow label="Čas" value={formatTimeRange(startTime)} />

              <SummaryRow
                strong
                label={slot?.isPeak ? 'Cena (špička)' : 'Cena'}
                value={
                  slot?.price == null
                    ? 'Nenastavena'
                    : `${formatPrice(slot.price)} · platba na místě`
                }
              />
            </dl>

            <p className="reservation-alert">
              <Icon name="info" size={20} />
              <span>
                Zrušit můžeš nejpozději 24 hodin před začátkem, tedy do{' '}
                {formatCancelDeadline(date, startTime)}.
              </span>
            </p>

            <div className="reservation-field">
              <label htmlFor="reservation-note">
                Poznámka pro provozovatele (nepovinné)
              </label>

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

            {(blockingMessage || submitError) && (
              <p className="reservation-error" role="alert">
                {blockingMessage || submitError}
              </p>
            )}

            <div className="reservation-submit">
              <button
                type="submit"
                className="reservation-btn-primary"
                disabled={submitting || Boolean(blockingMessage)}
              >
                {submitting ? 'Vytvářím rezervaci…' : 'Potvrdit rezervaci'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ---------- 1.4-E Termín mezitím obsazen ---------- */}

      {slotTaken && (
        <SlotTakenDialog
          slotLabel={slotLabel}
          onPickAnother={() => navigate('/hledat')}
          onClose={() => setSlotTaken(false)}
        />
      )}
    </div>
  );
}

export default function ReservationSummary() {
  return (
    <CurrentUserProvider>
      <ReservationSummaryContent />
    </CurrentUserProvider>
  );
}
