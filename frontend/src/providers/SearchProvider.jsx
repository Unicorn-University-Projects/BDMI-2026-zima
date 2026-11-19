import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { searchSportsGrounds } from '../calls/search';
import { buildSearchUrl, parseSearchParams } from '../utils/searchParams';

// ==========================================
// PROVIDER VYHLEDÁVÁNÍ (BUC-01)
// ==========================================
//
// Kritéria jsou v URL, ne ve stavu komponenty – přežijí obnovení stránky
// i tlačítko zpět a jdou rovnou do volání. Každá změna kritérií proto vede
// přes URL, aby byl jeden zdroj pravdy.

const SearchContext = createContext(null);

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch musí být uvnitř SearchProvider.');
  }
  return context;
}

export default function SearchProvider({ children }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { sport, lokalita, datum, sort } = parseSearchParams(searchParams);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  function applyCriteria(next) {
    setSearchParams(new URL(buildSearchUrl(next), window.location.origin).search);
  }

  const value = {
    criteria: { sport, lokalita, datum, sort },
    result,
    loading,
    error,

    // Akce obrazovky
    search: values => applyCriteria({ ...values, sort }),
    setSort: nextSort => applyCriteria({ sport, lokalita, datum, sort: nextSort }),
    pickDate: nextDate => applyCriteria({ sport, lokalita, datum: nextDate, sort }),
    // Širší okolí zatím znamená hledat bez omezení na lokalitu.
    widenArea: () => applyCriteria({ sport, lokalita: '', datum, sort })
  };

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}