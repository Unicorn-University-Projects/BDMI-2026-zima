import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import {
  deleteSportsGround,
  getSportsGround,
  getVenue,
  updateSportsGround
} from '../calls/venues';

import { buildSlots, findPreviewDate } from '../utils/openingHours';

// ==========================================
// PROVIDER DETAILU SPORTOVIŠTĚ
// ==========================================
//
// Prostřední vrstva: drží data z calls, stavy načítání a chyb, odvozené
// hodnoty i akce. Obrazovka a komponenty pod ní už jen zobrazují, co jim
// provider podá – nevolají API a nepočítají nic z dat.

const SportsGroundContext = createContext(null);

export function useSportsGround() {
  const context = useContext(SportsGroundContext);
  if (!context) {
    throw new Error('useSportsGround musí být uvnitř SportsGroundProvider.');
  }
  return context;
}

export default function SportsGroundProvider({ venueId, sportsGroundId, children }) {
  const [sportsGround, setSportsGround] = useState(null);
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([getSportsGround(sportsGroundId), getVenue(venueId)])
      .then(([item, parent]) => {
        if (!cancelled) {
          setSportsGround(item);
          setVenue(parent);
          setError('');
        }
      })
      .catch(e => {
        if (!cancelled) {
          setError(e.message || 'Detail sportoviště se nepodařilo načíst.');
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
  }, [venueId, sportsGroundId]);

  // Úprava posílá stejná pole jako vytvoření – backend u obou příkazů
  // očekává name, sportCode, surface a coverType.
  async function update(values) {
    const updated = await updateSportsGround(sportsGroundId, values);
    setSportsGround(updated);
    return updated;
  }

  // Po smazání už není co zobrazovat, takže se stav nepřepisuje – obrazovka
  // na úspěch reaguje odchodem zpět na areál.
  async function remove() {
    await deleteSportsGround(sportsGroundId);
  }

  const value = useMemo(() => {
    const openingHours = sportsGround?.openingHours ?? [];
    const priceList = sportsGround?.priceList ?? null;

    // Sportovcům se nabízí jen sportoviště s otevírací dobou a ceníkem.
    const isActive = sportsGround?.status === 'active' && Boolean(priceList);
    const previewDate = isActive ? findPreviewDate(openingHours) : null;

    return {
      sportsGround,
      venue,
      loading,
      error,
      isActive,
      openingHours,
      priceList,
      previewDate,
      slots: isActive ? buildSlots(openingHours, priceList, previewDate) : [],
      // Nastavení otevírací doby a ceníku (5.2) má vlastní obrazovku,
      // odkazuje na ni výzva i souhrn.
      pricingUrl: `/arealy/${venueId}/sportoviste/${sportsGroundId}/nastaveni`,
      update,
      remove
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sportsGround, venue, loading, error, venueId, sportsGroundId]);

  return (
    <SportsGroundContext.Provider value={value}>
      {children}
    </SportsGroundContext.Provider>
  );
}
