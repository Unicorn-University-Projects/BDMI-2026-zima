import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import AthleteTopBar from '../components/athlete/AthleteTopBar';
import NoFreeSportsGround from '../components/search/NoFreeSportsGround';
import ResultsToolbar from '../components/search/ResultsToolbar';
import SearchCard from '../components/search/SearchCard';
import SportsGroundResultCard from '../components/search/SportsGroundResultCard';

import { searchSportsGrounds } from '../services/search';
import { buildSearchUrl, parseSearchParams } from '../utils/searchParams';

import '../styles/search.css';

// ==========================================
// VÝSLEDKY VYHLEDÁVÁNÍ (BUC-01, obrazovky 1.2 a 1.2-A1)
// ==========================================
//
// Kritéria jsou v URL, ne ve stavu – přežijí obnovení stránky i tlačítko
// zpět a jsou rovnou vstupem pro hledání. Data zatím chodí z pevných
// hodnot v services/searchFixtures.js, protože booking služba neexistuje.

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const criteria = parseSearchParams(searchParams);

  // Formulář je řízený lokálně, do URL se zapíše až při odeslání.
  const [form, setForm] = useState(criteria);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { sport, lokalita, datum, sort } = criteria;

  useEffect(() => {
    setForm({ sport, lokalita, datum, sort });
  }, [sport, lokalita, datum, sort]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    searchSportsGrounds({ sport, lokalita, datum, sort })
      .then(data => {
        if (!cancelled) {
          setResult(data);
          setError('');
        }
      })
      .catch(e => {
        if (!cancelled) {
          setError(e.message || 'Vyhledávání se nepodařilo.');
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
  }, [sport, lokalita, datum, sort]);

  // Všechny změny kritérií jdou přes URL, ať je jeden zdroj pravdy.
  function applyCriteria(next) {
    setSearchParams(new URL(buildSearchUrl(next), window.location.origin).search);
  }

  function handleSubmit(values) {
    applyCriteria({ ...values, sort });
  }

  function handleSortChange(nextSort) {
    applyCriteria({ sport, lokalita, datum, sort: nextSort });
  }

  function handlePickDate(nextDate) {
    applyCriteria({ sport, lokalita, datum: nextDate, sort });
  }

  // Širší okolí zatím znamená hledat bez omezení na lokalitu.
  function handleWiderArea() {
    applyCriteria({ sport, lokalita: '', datum, sort });
  }

  return (
    <div className="search-page">
      <AthleteTopBar active="hledat" />

      <div className="search-content">
        <h1 className="search-title">Najdi volné sportoviště</h1>

        <SearchCard
          values={form}
          onChange={setForm}
          onSubmit={handleSubmit}
          disabled={loading}
        />

        {loading && <p className="search-message">Hledám volná sportoviště…</p>}

        {!loading && error && (
          <p className="search-message">
            <span className="search-error" role="alert">{error}</span>
          </p>
        )}

        {!loading && !error && result && result.total > 0 && (
          <>
            <ResultsToolbar
              total={result.total}
              sort={sort}
              onSortChange={handleSortChange}
            />

            <ul className="search-results">
              {result.itemList.map(item => (
                <SportsGroundResultCard key={item.id} item={item} />
              ))}
            </ul>
          </>
        )}

        {!loading && !error && result && result.total === 0 && (
          <NoFreeSportsGround
            datum={datum}
            lokalita={lokalita}
            nextFreeDate={result.nextFreeDate}
            onPickDate={handlePickDate}
            onWiderArea={handleWiderArea}
          />
        )}
      </div>
    </div>
  );
}