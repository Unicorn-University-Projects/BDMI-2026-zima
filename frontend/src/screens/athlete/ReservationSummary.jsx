import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import AthleteTopBar from '../../components/athlete/AthleteTopBar';
import ReservationCreated from '../../components/reservation/ReservationCreated';
import ReservationSummaryCard from '../../components/reservation/ReservationSummaryCard';
import ReservationNote from '../../components/reservation/ReservationNote';
import SlotTakenDialog from '../../components/reservation/SlotTakenDialog';

import CurrentUserProvider from '../../providers/CurrentUserProvider';
import ReservationProvider, { useReservation } from '../../providers/ReservationProvider';

import '../../styles/search.css';
import '../../styles/reservation.css';

// ==========================================
// SOUHRN REZERVACE (BUC-02, obrazovky 1.4, 1.4-E a 1.5)
// ==========================================
//
// Obrazovka jen skládá komponenty. Data, cenu i odeslání drží
// ReservationProvider, volání API je v calls/reservations.js
// a calls/venues.js.
//
// Co se rezervuje, nese adresa – sportoviště, den a hodina. Díky tomu
// obrazovka přežije obnovení stránky i otevření odkazu napřímo a
// nepotřebuje stav z předchozí obrazovky:
//   /rezervace/nova?sportoviste=<uuid>&datum=2026-11-03&cas=17:00
//
// Výběr termínu (obrazovka 1.3 Detail sportoviště) dělá někdo jiný.
// Až vznikne, stačí z vybraného slotu odkázat sem; nic jiného tahle
// obrazovka nepotřebuje, zbytek si dotáhne z backendu sama.

function ReservationSummaryContent() {
  const navigate = useNavigate();
  const {
    loading, loadError, blockingMessage, submitError, submitting,
    confirm, reservation, slotTaken, slotLabel, dismissSlotTaken
  } = useReservation();

  // ---------- 1.5 Rezervace vytvořena ----------

  if (reservation) {
    return (
      <div className="reservation-page">
        <AthleteTopBar active="hledat" />
        <div className="reservation-content">
          <ReservationCreated />
        </div>
      </div>
    );
  }

  // ---------- 1.4 Souhrn rezervace ----------

  const error = blockingMessage || submitError;

  return (
    <div className="reservation-page">
      <AthleteTopBar active="hledat" />

      <div className="reservation-content">
        {loading && <p className="reservation-message">Načítám sportoviště…</p>}

        {!loading && loadError && (
          <p className="reservation-message">
            <span className="reservation-error" role="alert">{loadError}</span>
          </p>
        )}

        {!loading && !loadError && (
          <form
            onSubmit={event => {
              event.preventDefault();
              if (!submitting && !blockingMessage) confirm();
            }}
            noValidate
          >
            <ReservationSummaryCard />
            <ReservationNote />

            {error && <p className="reservation-error" role="alert">{error}</p>}

            <div className="reservation-submit">
              <button
                type="submit"
                className="ps-btn ps-btn-primary ps-btn-block"
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
          onClose={dismissSlotTaken}
        />
      )}
    </div>
  );
}

export default function ReservationSummary() {
  const [searchParams] = useSearchParams();

  return (
    <CurrentUserProvider>
      <ReservationProvider
        sportsGroundId={searchParams.get('sportoviste') ?? ''}
        date={searchParams.get('datum') ?? ''}
        startTime={searchParams.get('cas') ?? ''}
      >
        <ReservationSummaryContent />
      </ReservationProvider>
    </CurrentUserProvider>
  );
}
