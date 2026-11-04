// detail areálu
/*
Získá ID areálu z adresy stránky a pomocí getVenue(id) načte jeho údaje.

Zobrazuje název, adresu, kontakty a poznámku pro sportovce. Po úspěšném vytvoření zobrazí potvrzovací zprávu.

Obsahuje také informaci, že areál zatím nemá sportoviště. Pokud areál s daným ID neexistuje, zobrazí chybovou stránku.
*/

import React from 'react';

import {
  Link,
  useLocation,
  useParams
} from 'react-router-dom';

import Icon from '../components/Icons';
import { getVenue } from '../services/venues';

// ==========================================
// 1. HLAVNÍ KOMPONENTA DETAILU AREÁLU
// ==========================================

export default function VenueDetail() {

  // Získání ID areálu z URL
  const { id } = useParams();

  // Získání informací z navigace
  const { state } = useLocation();

  // Načtení konkrétního areálu
  const venue = getVenue(id);

  // ==========================================
  // 2. AREÁL NEBYL NALEZEN
  // ==========================================

  if (!venue) {

    return (

      <div className="form-card">

        <h1>Areál nebyl nalezen</h1>

        <Link
          to="/arealy"
          className="btn primary"
        >
          Zpět na moje areály
        </Link>

      </div>

    );
  }

  // ==========================================
  // 3. VYKRESLENÍ DETAILU AREÁLU
  // ==========================================

  return (
    <>

      {/* Návrat na seznam areálů */}

      <Link
        className="back"
        to="/arealy"
      >
        <Icon name="arrow" size={17} />
        Moje areály
      </Link>

      {/* ======================================
          4. ÚSPĚŠNÉ VYTVOŘENÍ AREÁLU
      ====================================== */}

      {state?.created && (

        <div
          className="success"
          role="status"
        >

          <Icon name="check" />

          Areál byl úspěšně vytvořen.

        </div>

      )}

      {/* ======================================
          5. NADPIS A ADRESA AREÁLU
      ====================================== */}

      <div className="page-heading">

        <div>

          <div className="eyebrow">
            DETAIL AREÁLU
          </div>

          <h1>{venue.name}</h1>

          <p>

            <Icon name="pin" size={16} />

            {venue.street} {venue.streetNumber},
            {' '}
            {venue.city}

          </p>

        </div>

      </div>

      {/* ======================================
          6. HLAVNÍ OBSAH DETAILU
      ====================================== */}

      <div className="detail-layout">

        {/* ==================================
            7. ZÁKLADNÍ ÚDAJE AREÁLU
        ================================== */}

        <section className="form-card">

          <h2>Základní údaje</h2>

          <dl className="detail-data">

            {/* Název */}

            <div>
              <dt>Název</dt>
              <dd>{venue.name}</dd>
            </div>

            {/* Adresa */}

            <div>
              <dt>Adresa</dt>

              <dd>
                {venue.street} {venue.streetNumber},
                {' '}
                {venue.city}
              </dd>
            </div>

            {/* Telefon */}

            <div>
              <dt>Telefon</dt>
              <dd>{venue.phoneNumber}</dd>
            </div>

            {/* E-mail */}

            <div>
              <dt>E-mail</dt>
              <dd>{venue.emailAddress}</dd>
            </div>

            {/* Poznámka pro sportovce */}

            <div>

              <dt>Poznámka pro sportovce</dt>

              <dd>
                {venue.operatorNote || 'Bez poznámky'}
              </dd>

            </div>

          </dl>

        </section>

        {/* ==================================
            8. SEKCE SPORTOVIŠŤ
        ================================== */}

        <section className="form-card sport-section">

          {/* Ikona sportoviště */}

          <div className="empty-icon">
            <Icon name="building" size={28} />
          </div>

          {/* Informace o sportovištích */}

          <h2>Zatím žádná sportoviště</h2>

          <p>
            Areál se ve veřejném vyhledávání
            nezobrazí, dokud k němu nebudou
            přidána sportoviště.
          </p>

          {/* Informace o další části projektu */}

          <span className="pending">
            Přidání sportovišť připravuje
            další člen týmu.
          </span>

        </section>

      </div>

    </>
  );
}
