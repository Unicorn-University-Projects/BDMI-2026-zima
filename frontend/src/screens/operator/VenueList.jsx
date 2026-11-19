import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import Icon from '../../components/Icons';

import {
  listVenues,
  deleteVenue
} from '../../calls/venues';

export default function VenueList() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const itemList = await listVenues();
        if (!cancelled) {
          setVenues(itemList);
          setError('');
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Seznam areálů se nepodařilo načíst.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(id, name) {
    if (!window.confirm(`Opravdu chcete smazat areál "${name}"?`)) {
      return;
    }

    try {
      await deleteVenue(id);
      setVenues(previous => previous.filter(venue => venue.id !== id));
    } catch (e) {
      window.alert(e.message || 'Areál se nepodařilo smazat.');
    }
  }

  if (loading) {
    return (
      <div className="venues-page">
        <div className="venues-heading">
          <h1>Moje areály</h1>
        </div>
        <p>Načítám areály…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="venues-page">
        <div className="venues-heading">
          <h1>Moje areály</h1>
        </div>
        <div className="venue-submit-error" role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="venues-page">
      <div className="venues-heading">
        <h1>Moje areály</h1>

        {venues.length > 0 && (
          <Link to="/arealy/novy" className="venues-create-button">
            <Icon name="plus" size={18} />
            Vytvořit areál
          </Link>

        )}
      </div>

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

          <Link to="/arealy/novy" className="venues-create-button">
            <Icon name="plus" size={16} />
            Vytvořit areál
          </Link>
        </section>
      ) : (
        <div className="venues-list">
          {venues.map((venue) => (
            <article key={venue.id} className="venues-list-card">
              <div className="venues-list-icon">
                <Icon name="building" size={26} />
              </div>

              <div className="venues-list-info">
                <h2>{venue.name}</h2>

                <div className="venues-list-address">
                  <Icon name="pin" size={18} />
                  <span>
                    {[venue.street, venue.streetNumber].filter(Boolean).join(' ')},{' '}
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
