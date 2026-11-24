import React, { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

import Icon from '../../components/Icons';
import EditSportsGroundDialog from '../../components/sportsGround/EditSportsGroundDialog';
import SettingsSummary from '../../components/sportsGround/SettingsSummary';
import SetupCallout from '../../components/sportsGround/SetupCallout';
import SlotPreview from '../../components/sportsGround/SlotPreview';
import SportsGroundFacts from '../../components/sportsGround/SportsGroundFacts';
import SportsGroundHeader from '../../components/sportsGround/SportsGroundHeader';

import SportsGroundProvider, { useSportsGround } from '../../providers/SportsGroundProvider';

// ==========================================
// DETAIL SPORTOVIŠTĚ (BUC-08, obrazovky 5.1 a 5.3)
// ==========================================
//
// Obrazovka jen skládá komponenty dohromady. Data, stavy a akce drží
// SportsGroundProvider, volání API je v calls/venues.js.

function BackLink({ venueId, children }) {
  return (
    <Link to={`/arealy/${venueId}`} className="sports-ground-back">
      <Icon name="arrow" size={18} />
      {children}
    </Link>
  );
}

function SportsGroundDetailContent({ venueId }) {
  const { sportsGround, venue, loading, error, isActive } = useSportsGround();
  const [showEdit, setShowEdit] = useState(false);

  // Obrazovka nastavení (5.2) se po uložení vrací sem a přes stav cesty
  // si vyžádá potvrzení.
  const location = useLocation();

  if (loading) {
    return (
      <div className="sports-ground-page">
        <p>Načítám sportoviště…</p>
      </div>
    );
  }

  if (error || !sportsGround) {
    return (
      <div className="sports-ground-page">
        <h1>{error ? 'Chyba' : 'Sportoviště nebylo nalezeno'}</h1>

        {error && (
          <div className="venue-submit-error" role="alert">
            {error}
          </div>
        )}

        <BackLink venueId={venueId}>Zpět na areál</BackLink>
      </div>
    );
  }

  return (
    <div className="sports-ground-page">
      <div className="sports-ground-content">

        <BackLink venueId={venueId}>{venue?.name ?? 'Zpět na areál'}</BackLink>

        {location.state?.pricingSaved && (
          <div className="sports-ground-saved" role="status">
            ✓ &nbsp;Uloženo. Kurt se teď nabízí ve vyhledávání.
          </div>
        )}

        <SportsGroundHeader onEdit={() => setShowEdit(true)} />

        {showEdit && <EditSportsGroundDialog onClose={() => setShowEdit(false)} />}

        {/* Bez otevírací doby a ceníku se sportoviště nenabízí (5.1),
            jinak se ukáže souhrn a náhled slotů (5.3). */}
        {isActive ? (
          <>
            <SettingsSummary />
            <SlotPreview />
          </>
        ) : (
          <SetupCallout />
        )}

        <SportsGroundFacts />

      </div>
    </div>
  );
}

export default function SportsGroundDetail() {
  const { id, sportsGroundId } = useParams();

  return (
    <SportsGroundProvider venueId={id} sportsGroundId={sportsGroundId}>
      <SportsGroundDetailContent venueId={id} />
    </SportsGroundProvider>
  );
}