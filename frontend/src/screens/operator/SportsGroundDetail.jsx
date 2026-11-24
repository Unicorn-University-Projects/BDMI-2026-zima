import React, { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import Icon from '../../components/Icons';
import BackLink from '../../components/common/BackLink';
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

function SportsGroundDetailContent({ venueId }) {
  const { sportsGround, loading, error, isActive, remove } = useSportsGround();
  const [showEdit, setShowEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Obrazovka nastavení (5.2) se po uložení vrací sem a přes stav cesty
  // si vyžádá potvrzení.
  const location = useLocation();
  const navigate = useNavigate();

  // Smazané sportoviště už nelze zobrazit, proto se po úspěchu odchází
  // na areál. Chybu hlásí backend – třeba když na sportoviště odkazují
  // rezervace a smazat ho nejde.
  async function handleDelete() {
    const confirmed = window.confirm(
      `Opravdu chcete odstranit sportoviště "${sportsGround.name}"?`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await remove();
      navigate(`/arealy/${venueId}`, { replace: true });
    } catch (e) {
      window.alert(e.message || 'Sportoviště se nepodařilo odstranit.');
      setDeleting(false);
    }
  }

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

        <BackLink to={`/arealy/${venueId}`} className="sports-ground-back">
          <Icon name="arrow" size={18} />
          Zpět
        </BackLink>
      </div>
    );
  }

  return (
    <div className="sports-ground-page">
      <div className="sports-ground-content">

        <BackLink to={`/arealy/${venueId}`} className="sports-ground-back">
          <Icon name="arrow" size={18} />
          Zpět
        </BackLink>

        {location.state?.pricingSaved && (
          <div className="sports-ground-saved" role="status">
            ✓ &nbsp;Uloženo. Kurt se teď nabízí ve vyhledávání.
          </div>
        )}

        <SportsGroundHeader
          onEdit={() => setShowEdit(true)}
          onDelete={handleDelete}
          deleting={deleting}
        />

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