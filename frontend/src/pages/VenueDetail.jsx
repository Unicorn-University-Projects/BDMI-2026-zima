import React, { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

import Icon from '../components/Icons';
import { getVenue } from '../services/venues';

export default function VenueDetail() {
  const { id } = useParams();
  const location = useLocation();

  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isCreated = location.state?.created === true;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const item = await getVenue(id);
        if (!cancelled) {
          setVenue(item);
          setError('');
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Detail areálu se nepodařilo načíst.');
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
  }, [id]);

  if (loading) {
    return (
      <div className="venue-detail-page">
        <p>Načítám areál…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="venue-detail-page">
        <h1>Chyba</h1>
        <div className="venue-submit-error" role="alert">
          {error}
        </div>
        <Link to="/arealy" className="back">
          <Icon name="arrow" size={17} />
          Zpět na moje areály
        </Link>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="venue-detail-page">
        <h1>Areál nebyl nalezen</h1>

        <Link to="/arealy" className="back">
          <Icon name="arrow" size={17} />
          Zpět na moje areály
        </Link>
      </div>
    );
  }

  const address = [
    [venue.street, venue.streetNumber].filter(Boolean).join(' '),
    venue.city
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="venue-detail-page">
      <Link to="/arealy" className="venue-detail-back">
        <Icon name="arrow" size={16} />
        Moje areály
      </Link>

      <div className="venue-detail-header">
        <div className="venue-detail-heading">
          <h1>{venue.name}</h1>

          <div className="venue-detail-contact">
            <span>
              <Icon name="pin" size={15} />
              {address}
            </span>

            {venue.phoneNumber && (
              <span>
                <Icon name="phone" size={15} />
                {venue.phoneNumber}
              </span>
            )}

            {venue.emailAddress && (
              <span>
                <Icon name="mail" size={15} />
                {venue.emailAddress}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          className="venue-detail-edit"
          disabled
          title="Úprava areálu bude doplněna"
        >
          <Icon name="edit" size={17} />
          Upravit areál
        </button>
      </div>

      {isCreated && (
        <div className="venue-created-success" role="status">
          <Icon name="check" size={20} />

          <div>
            <strong>Areál je vytvořen</strong>
            <p>
              Teď přidej sportoviště, která chceš
              nabízet k rezervaci.
            </p>
          </div>
        </div>
      )}

      <section className="venue-sports-section">
        <div className="venue-sports-header">
          <h2>Sportoviště ({venue.sportsFieldsCount ?? 0})</h2>

          <button
            type="button"
            className="venue-add-sport"
            disabled
            title="Přidávání sportovišť bude doplněno"
          >
            <Icon name="plus" size={18} />
            Přidat sportoviště
          </button>
        </div>

        <div className="venue-sports-empty">
          <div className="venue-sports-empty-icon">
            <Icon name="grid" size={30} />
          </div>

          <h3>Zatím tu není žádné sportoviště</h3>

          <p>
            Přidej kurty, hřiště nebo haly. Pak jim
            nastavíš otevírací dobu a ceník.
          </p>
        </div>
      </section>
    </div>
  );
}
