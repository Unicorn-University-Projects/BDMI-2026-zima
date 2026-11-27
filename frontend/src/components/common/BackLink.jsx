import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

// ==========================================
// ODKAZ ZPĚT
// ==========================================
//
// Na stejnou obrazovku se dá dojít z víc míst – ceník otevřeš z detailu
// sportoviště i z karty v detailu areálu, úpravu areálu ze seznamu
// i z jeho detailu. Pevná cesta by uživatele poslala jinam, než odkud
// přišel, proto se klik vrací v historii.
//
// `to` je záloha pro případ, kdy se není kam vracet (odkaz otevřený
// napřímo, obnovení stránky). Zároveň zůstává v href, takže otevření
// v novém panelu vede na smysluplnou stránku a ne do prázdna.

export default function BackLink({ to, className, children }) {
  const navigate = useNavigate();
  const location = useLocation();

  // První záznam v historii má klíč 'default' – krok zpět by odešel
  // mimo aplikaci, tam se chceme držet zálohy.
  const canGoBack = location.key !== 'default';

  function handleClick(event) {
    if (!canGoBack) return;

    // Otevření v novém panelu nebo prostředním tlačítkem necháme být.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
      return;
    }

    event.preventDefault();
    navigate(-1);
  }

  return (
    <Link to={to} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
