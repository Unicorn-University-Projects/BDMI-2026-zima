import React, { createContext, useContext, useEffect, useState } from 'react';

import { apiFetch } from '../calls/api';

// ==========================================
// PROVIDER PŘIHLÁŠENÉHO UŽIVATELE
// ==========================================
//
// Aby si horní lišta nemusela sama volat API. O vypršený token se stará
// RequireAuth v main.jsx, tady je chyba nekritická – jen se nezobrazí jméno.

const CurrentUserContext = createContext(null);

export function useCurrentUser() {
  return useContext(CurrentUserContext) ?? { user: null, initials: '', fullName: '' };
}

export default function CurrentUserProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let cancelled = false;

    apiFetch('/auth/user/getMe')
      .then(data => {
        if (!cancelled) {
          setUser(data.user || data);
        }
      })
      .catch(() => {
        // Jméno v liště není nic kritického.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = {
    user,
    initials: user
      ? `${user.firstName?.[0] || ''}${user.surName?.[0] || ''}`.toUpperCase()
      : '',
    fullName: user ? `${user.firstName} ${user.surName}` : ''
  };

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
}
