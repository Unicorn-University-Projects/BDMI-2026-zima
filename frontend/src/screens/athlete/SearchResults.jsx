import React, { useEffect, useState } from 'react';

import AthleteTopBar from '../../components/athlete/AthleteTopBar';
import NoFreeSportsGround from '../../components/search/NoFreeSportsGround';
import ResultsToolbar from '../../components/search/ResultsToolbar';
import SearchCard from '../../components/search/SearchCard';
import SportsGroundResultCard from '../../components/search/SportsGroundResultCard';

import CurrentUserProvider from '../../providers/CurrentUserProvider';
import SearchProvider, { useSearch } from '../../providers/SearchProvider';

import '../../styles/search.css';

// ==========================================
// VÝSLEDKY VYHLEDÁVÁNÍ (BUC-01, obrazovky 1.2 a 1.2-A1)
// ==========================================
//
// Obrazovka jen skládá komponenty. Kritéria, výsledky a akce drží
// SearchProvider; data zatím chodí z pevných hodnot v calls/searchFixtures.js,
// protože booking služba neexistuje.

function SearchResultsContent() {
  const { criteria, result, loading, error, search, setSort, pickDate, widenArea } = useSearch();

  // Formulář je řízený lokálně, do URL se zapíše až při odeslání.
  const [form, setForm] = useState(criteria);

  useEffect(() => {
    setForm(criteria);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criteria.sport, criteria.lokalita, criteria.datum, criteria.sort]);

  return (
    <div className="search-page">
      <AthleteTopBar active="hledat" />

      <div className="search-content">
        <h1 className="search-title">Najdi volné sportoviště</h1>

        <SearchCard
          values={form}
          onChange={setForm}
          onSubmit={search}
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
              sort={criteria.sort}
              onSortChange={setSort}
            />

            <ul className="search-results">
              {result.itemList.map(item => (
                <SportsGroundResultCard key={item.id} item={item} date={criteria.datum} />
              ))}
            </ul>
          </>
        )}

        {!loading && !error && result && result.total === 0 && (
          <NoFreeSportsGround
            datum={criteria.datum}
            lokalita={criteria.lokalita}
            nextFreeDate={result.nextFreeDate}
            onPickDate={pickDate}
            onWiderArea={widenArea}
          />
        )}
      </div>
    </div>
  );
}

export default function SearchResults() {
  return (
    <CurrentUserProvider>
      <SearchProvider>
        <SearchResultsContent />
      </SearchProvider>
    </CurrentUserProvider>
  );
}
