import React from 'react';
import { Link, useParams } from 'react-router-dom';

import Icon from '../components/Icons';

// ==========================================
// OTEVÍRACÍ DOBA A CENÍK (BUC-08, obrazovka 5.2)
// ==========================================
//
// Zatím jen zástupná stránka, aby tlačítka z detailu sportoviště někam
// vedla. Formulář podle návrhu (7 dnů s přepínačem a časy, "Použít čas
// pondělí pro všechny dny", ceník se špičkou) sem teprve přijde.
//
// Backend je hotový: POST /venue/sportsGround/setOpeningHoursAndPriceList,
// v API vrstvě je připravené volání setOpeningHoursAndPriceList
// v services/venues.js.

export default function OpeningHoursForm() {
  const { id, sportsGroundId } = useParams();

  return (
    <div className="sports-ground-page">
      <div className="sports-ground-content">
        <Link
          to={`/arealy/${id}/sportoviste/${sportsGroundId}`}
          className="sports-ground-back"
        >
          <Icon name="arrow" size={18} />
          Zpět na sportoviště
        </Link>

        <div className="sports-ground-header">
          <div className="sports-ground-title">
            <h1>Otevírací doba a ceník</h1>
          </div>
        </div>

        <section className="sports-ground-callout">
          <span className="sports-ground-callout-icon">
            <Icon name="edit" size={22} />
          </span>

          <div className="sports-ground-callout-text">
            <strong>Formulář se teprve připravuje</strong>
            <p>
              Dokud tu nebude, jde otevírací dobu a ceník nastavit jen
              příkazem sportsGround/setOpeningHoursAndPriceList.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}