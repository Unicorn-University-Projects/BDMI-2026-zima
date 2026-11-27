import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import AthleteTopBar from '../../components/athlete/AthleteTopBar';
import BackLink from '../../components/common/BackLink';
import Icon from '../../components/Icons';

import CurrentUserProvider from '../../providers/CurrentUserProvider';

import { getAvailability } from '../../calls/availability';
import { clearToken } from '../../calls/api';
import { getSportsGround, getVenue } from '../../calls/venues';

import { SEARCH_PATH } from '../../utils/searchParams';
import {
  addDays,
  dayOfMonth,
  formatPrice,
  longDateLabel,
  pragueToday,
  shortDateLabel,
  shortDayName,
  timeLabel
} from '../../utils/slotDates';

import '../../styles/search.css';
import '../../styles/athlete-detail.css';

// ==========================================
// DETAIL SPORTOVIŠTĚ PRO SPORTOVCE (BUC-02, obrazovka 1.3)
// ==========================================
//
// Informace o sportovišti, kalendář dnů a hodinové sloty. Vybraný termín
// se předá souhrnu rezervace (1.4) v adrese:
//   /rezervace/nova?sportoviste=<uuid>&datum=2026-11-03&cas=17:00
//
// Adresa stránky: /sportoviste/<uuid>?datum=2026-11-03
// Parametr datum je nepovinný – karta ve výsledcích hledání ho přidává, aby se
// detail otevřel na dni, který sportovec hledal.
//
// Hodnocení sportovců (součást návrhu 1.3) patří do US-10, zatím se nezobrazují.

const DNU_V_KALENDARI = 5;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const COVER_TYPES = {
  indoor: 'Krytý',
  outdoor: 'Venkovní'
};

function Arrow({ direction, size = 16, strokeWidth = 2 }) {
  const paths = {
    back: 'M19 12H5m6-6-6 6 6 6',
    left: 'm15 6-6 6 6 6',
    right: 'm9 6 6 6-6 6'
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[direction]} />
    </svg>
  );
}

function venueLine(venue) {
  if (!venue) return '';
  const street = [venue.street, venue.streetNumber].filter(Boolean).join(' ');
  return [venue.name, [street, venue.city].filter(Boolean).join(', ')]
    .filter(Boolean)
    .join(' · ');
}

function AthleteSportsGroundDetailContent() {
  const { sportsGroundId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const today = useMemo(() => pragueToday(), []);

  // Den z adresy použijeme jen když je platný a není v minulosti.
  const requestedDate = searchParams.get('datum');
  const firstDate =
    requestedDate && DATE_PATTERN.test(requestedDate) && requestedDate >= today
      ? requestedDate
      : today;

  // Sportoviště a areál
  const [ground, setGround] = useState(null);
  const [venue, setVenue] = useState(null);
  const [groundError, setGroundError] = useState('');
  const [groundLoading, setGroundLoading] = useState(true);

  // Kalendář a sloty
  const [date, setDate] = useState(firstDate);
  const [windowStart, setWindowStart] = useState(firstDate);
  const [availability, setAvailability] = useState({ loading: true, error: '', data: null });
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState(null);

  // Neplatný token -> zpátky na přihlášení
  const isLoggedOut = (e) => {
    if (e?.status === 401) {
      clearToken();
      navigate('/prihlaseni', { replace: true });
      return true;
    }
    return false;
  };

  // ---------- Načtení sportoviště a areálu ----------
  useEffect(() => {
    let cancelled = false;

    setGroundLoading(true);
    setGroundError('');
    setGround(null);
    setVenue(null);

    getSportsGround(sportsGroundId)
      .then((data) => {
        if (cancelled) return;
        setGround(data);
        setGroundLoading(false);

        // Název a adresa areálu a poznámka pro sportovce; když se nenačtou, stránka funguje dál
        getVenue(data.venueId)
          .then((v) => {
            if (!cancelled) setVenue(v);
          })
          .catch((e) => {
            if (!cancelled) isLoggedOut(e);
          });
      })
      .catch((e) => {
        if (cancelled || isLoggedOut(e)) return;
        setGroundLoading(false);
        setGroundError(
          e.status === 404 || e.status === 400
            ? 'Sportoviště se nenašlo nebo ho momentálně nenabízíme.'
            : e.message || 'Načtení sportoviště se nezdařilo.'
        );
      });

    return () => {
      cancelled = true;
    };
  }, [sportsGroundId]);

  // ---------- Načtení slotů pro vybraný den ----------
  useEffect(() => {
    if (!ground) return undefined;
    let cancelled = false;

    setAvailability({ loading: true, error: '', data: null });
    setSelected(null);

    getAvailability(sportsGroundId, date)
      .then((data) => {
        if (!cancelled) setAvailability({ loading: false, error: '', data });
      })
      .catch((e) => {
        if (cancelled || isLoggedOut(e)) return;
        setAvailability({
          loading: false,
          error: e.message || 'Načtení volných termínů se nezdařilo.',
          data: null
        });
      });

    return () => {
      cancelled = true;
    };
  }, [ground, sportsGroundId, date, reloadKey]);

  // ---------- Akce ----------
  const days = Array.from({ length: DNU_V_KALENDARI }, (_, i) => addDays(windowStart, i));
  const atStart = windowStart <= today;

  const moveCalendar = (direction) => {
    const next = addDays(windowStart, direction * DNU_V_KALENDARI);
    setWindowStart(next < today ? today : next);
  };

  const continueToSummary = () => {
    if (!selected) return;

    // Stejný tvar adresy, jaký čte souhrn rezervace (čas "17:00" nechceme kódovat).
    navigate(
      `/rezervace/nova?sportoviste=${encodeURIComponent(sportsGroundId)}&datum=${date}&cas=${selected.startTime}`
    );
  };

  // ---------- Vykreslení ----------
  const slotList = availability.data?.slotList ?? [];
  const tags = ground
    ? [ground.sportName, ground.surface, COVER_TYPES[ground.coverType]].filter(Boolean)
    : [];

  return (
    <div className="sgd-page">
      <AthleteTopBar active="hledat" />

      <main className="sgd-main">
        <BackLink to={SEARCH_PATH} className="sgd-back">
          <Arrow direction="back" size={14} strokeWidth={2.2} />
          Zpět na výsledky hledání
        </BackLink>

        {groundLoading && <p className="sgd-state">Načítám sportoviště…</p>}

        {!groundLoading && groundError && (
          <div className="sgd-alert" role="alert">
            {groundError}
          </div>
        )}

        {ground && (
          <>
            <h1 className="sgd-title">{ground.name}</h1>

            {venue && (
              <p className="sgd-address">
                <Icon name="pin" size={14} />
                {venueLine(venue)}
              </p>
            )}

            {tags.length > 0 && (
              <div className="sgd-tags">
                {tags.map((tag) => (
                  <span key={tag} className="sgd-tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="sgd-layout">
              {/* LEVÝ SLOUPEC: fotka a poznámka areálu */}
              <div className="sgd-info">
                {/* Fotky backend neumí, v návrhu je zástupná plocha */}
                <div className="sgd-photo" aria-hidden="true">
                  <Icon name="image" size={32} />
                </div>

                {venue?.operatorNote && (
                  <div className="sgd-note">
                    <Icon name="info" size={16} />
                    <div>
                      <strong>Poznámka areálu</strong>
                      <p>{venue.operatorNote}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* PRAVÝ SLOUPEC: výběr termínu */}
              <aside className="sgd-booking" aria-label="Výběr termínu">
                <h2>Vyber termín</h2>

                <div className="sgd-days">
                  <button
                    type="button"
                    className="sgd-arrow"
                    onClick={() => moveCalendar(-1)}
                    disabled={atStart}
                    aria-label="Dřívější dny"
                  >
                    <Arrow direction="left" />
                  </button>

                  <div className="sgd-days-list">
                    {days.map((d) => (
                      <button
                        type="button"
                        key={d}
                        className={`sgd-day${d === date ? ' active' : ''}`}
                        aria-pressed={d === date}
                        onClick={() => setDate(d)}
                      >
                        <small>{shortDayName(d)}</small>
                        <strong>{dayOfMonth(d)}</strong>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="sgd-arrow"
                    onClick={() => moveCalendar(1)}
                    aria-label="Pozdější dny"
                  >
                    <Arrow direction="right" />
                  </button>
                </div>

                <p className="sgd-date-label">{longDateLabel(date)}</p>

                {availability.loading && <p className="sgd-state">Načítám volné termíny…</p>}

                {!availability.loading && availability.error && (
                  <div className="sgd-alert" role="alert">
                    {availability.error}
                    <button
                      type="button"
                      className="sgd-retry"
                      onClick={() => setReloadKey((k) => k + 1)}
                    >
                      Zkusit znovu
                    </button>
                  </div>
                )}

                {!availability.loading && !availability.error && availability.data && (
                  <>
                    {(availability.data.isClosed || slotList.length === 0) && (
                      <p className="sgd-state">V tento den není sportoviště k dispozici.</p>
                    )}

                    {slotList.length > 0 && (
                      <>
                        <div className="sgd-slots">
                          {slotList.map((slot) => {
                            const free = slot.status === 'free';
                            const isSelected = selected?.startTime === slot.startTime;
                            const className = [
                              'sgd-slot',
                              free ? 'free' : 'busy',
                              slot.isPeak && free ? 'peak' : '',
                              isSelected ? 'selected' : ''
                            ]
                              .filter(Boolean)
                              .join(' ');

                            return (
                              <button
                                type="button"
                                key={slot.startTime}
                                className={className}
                                disabled={!free}
                                aria-pressed={isSelected}
                                onClick={() => setSelected(slot)}
                              >
                                <strong>{timeLabel(slot.startTime)}</strong>
                                <small>
                                  {free
                                    ? formatPrice(slot.price)
                                    : slot.status === 'past'
                                      ? 'Prošlo'
                                      : 'Obsazeno'}
                                </small>
                              </button>
                            );
                          })}
                        </div>

                        <ul className="sgd-legend">
                          <li><span className="dot free" />Volno</li>
                          <li><span className="dot peak" />Špička</li>
                          <li><span className="dot selected" />Vybráno</li>
                          <li><span className="dot busy" />Obsazeno</li>
                        </ul>
                      </>
                    )}
                  </>
                )}

                {selected && (
                  <div className="sgd-summary">
                    <strong>
                      {shortDateLabel(date)} · {timeLabel(selected.startTime)}–{timeLabel(selected.endTime)}
                    </strong>
                    <span>
                      {formatPrice(selected.price)}
                      {selected.isPeak ? ' · cena ve špičce' : ''} · platba na místě
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  className="ps-btn ps-btn-primary ps-btn-block sgd-continue"
                  disabled={!selected}
                  onClick={continueToSummary}
                >
                  Pokračovat k rezervaci
                </button>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function AthleteSportsGroundDetail() {
  return (
    <CurrentUserProvider>
      <AthleteSportsGroundDetailContent />
    </CurrentUserProvider>
  );
}
