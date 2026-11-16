
/*
  SEZNAM AREÁLŮ

  Zobrazuje areály demo provozovatele.
  Umožňuje vytvoření, úpravu a smazání areálu.
  Data jsou uložená v localStorage.
*/

import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import Icon from '../components/Icons';

import {
  listVenues,
  deleteVenue
} from '../services/venues';

// ==========================================
// SEZNAM AREÁLŮ
// ==========================================

export default function VenueList() {

  // Načtení areálů
  const [venues, setVenues] = useState(() => listVenues());

  // ========================================
  // SMAZÁNÍ AREÁLU
  // ========================================

  const handleDelete = (id, name) => {

    const confirmed = window.confirm(
      `Opravdu chcete smazat areál "${name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {

      deleteVenue(id);

      // Aktualizace seznamu
      setVenues(listVenues());

    } catch (error) {

      window.alert(error.message);

    }
  };

  // ========================================
  // VYKRESLENÍ STRÁNKY
  // ========================================

  return (
    <div className="venues-page">

      {/* NADPIS A VYTVOŘENÍ AREÁLU */}

      <div className="venues-heading">

        <h1>Moje areály</h1>

        {venues.length > 0 && (

          <Link
            to="/arealy/novy"
            className="venues-create-button"
          >
            <Icon name="plus" size={18} />
            Vytvořit areál
          </Link>

        )}

      </div>

      {/* PRÁZDNÝ SEZNAM */}

      {venues.length === 0 ? (

        <section className="venues-empty">

          <div className="venues-empty-icon">
            <Icon name="venueForm" size={26} />
          </div>

          <h2>Zatím nemáš žádný areál</h2>

          <p>
            Založ areál a přidej do něj sportoviště,
            která si sportovci budou rezervovat.
          </p>

          <Link
            to="/arealy/novy"
            className="venues-create-button"
          >
            <Icon name="plus" size={16} />
            Vytvořit areál
          </Link>

        </section>

      ) : (

        <div className="venues-list">

          {/* SEZNAM VYTVOŘENÝCH AREÁLŮ */}

          {venues.map((venue) => (

            <article
              key={venue.id}
              className="venues-list-card"
            >

              {/* IKONA AREÁLU */}

              <div className="venues-list-icon">
                <Icon name="building" size={26} />
              </div>

              {/* NÁZEV A ADRESA */}

              <div className="venues-list-info">

                <h2>{venue.name}</h2>

                <div className="venues-list-address">

                  <Icon name="pin" size={18} />

                  <span>
                    {venue.street} {venue.streetNumber},{" "}
                    {venue.city}
                  </span>

                </div>

              </div>

              {/* TLAČÍTKA AREÁLU */}

              <div className="venue-actions">

                {/* UPRAVIT */}

                <Link
                  to={`/arealy/${venue.id}/upravit`}
                  className="venue-action-btn edit"
                >
                  <Icon name="edit" size={17} />
                  Upravit
                </Link>

                {/* SMAZAT */}

                <button
                  type="button"
                  className="venue-action-btn delete"
                  onClick={() =>
                    handleDelete(venue.id, venue.name)
                  }
                >
                  <Icon name="trash" size={17} />
                  Smazat
                </button>

                {/* SPRAVOVAT SPORTOVIŠTĚ */}

                <Link
                  to={`/arealy/${venue.id}`}
                  className="venues-manage-button"
                >
                  <Icon name="calendar" size={19} />
                  Spravovat sportoviště
                </Link>

              </div>

            </article>

          ))}

        </div>

      )}

    </div>
  );
}
