import React, { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

import Icon from '../../components/Icons';
import AddSportsGroundDialog from '../../components/sportsGround/AddSportsGroundDialog';
import SportsGroundList from '../../components/sportsGround/SportsGroundList';
import {
  createSportsGround,
  getVenue,
  listSportsGrounds
} from '../../calls/venues';

export default function VenueDetail() {
  const { id } = useParams();
  const location = useLocation();

  const [venue, setVenue] = useState(null);
  const [sportsGrounds, setSportsGrounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const isCreated = location.state?.created === true;

  async function load() {
    const item = await getVenue(id);
    const grounds = await listSportsGrounds(id);
    setVenue(item);
    setSportsGrounds(grounds);
    setError('');
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        await load();
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

    run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Vazba na areál je tady: venueId bere detail z adresy, formulář ho neřeší.
  async function createAndReload(values) {
    await createSportsGround({ venueId: id, ...values });
    await load();
    setJustSaved(true);
  }

  async function handleCreateSportsGround(values) {
    await createAndReload(values);
    setShowDialog(false);
  }

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

      {justSaved ? (
        <div className="sg-alert" role="status">
          <Icon name="info" size={20} />

          <div>
            <strong>Sportoviště uložena</strong>
            <p>
              Nastav jim otevírací dobu a ceník – teprve pak je sportovci
              uvidí ve vyhledávání.
            </p>
          </div>
        </div>
      ) : (
        isCreated && (
          <div className="venue-created-success" role="status">
            <Icon name="check" size={20} />

            <div>
              <strong>Areál je vytvořený</strong>
              <p>
                Teď přidej sportoviště, která chceš
                nabízet k rezervaci.
              </p>
            </div>
          </div>
        )
      )}

      <section className="venue-sports-section">
        <div className="venue-sports-header">
          <h2>Sportoviště ({sportsGrounds.length})</h2>

          <button
            type="button"
            className="venue-add-sport"
            onClick={() => setShowDialog(true)}
          >
            <Icon name="plus" size={18} />
            Přidat sportoviště
          </button>
        </div>

        {showDialog && (
          <AddSportsGroundDialog
            venueName={venue.name}
            onCreate={handleCreateSportsGround}
            onCreateAndNext={createAndReload}
            onClose={() => setShowDialog(false)}
          />
        )}

        {sportsGrounds.length === 0 ? (
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
        ) : (
          <SportsGroundList venueId={id} sportsGrounds={sportsGrounds} />
        )}
      </section>
    </div>
  );
}
