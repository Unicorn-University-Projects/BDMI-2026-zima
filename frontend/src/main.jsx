import playspotLogo from './assets/playspot-logo.png';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import {
  BrowserRouter,
  NavLink,
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate
} from 'react-router-dom';

// Přihlášení, registrace a obnova hesla (obrazovky z Figmy) a práce s tokenem
import App from './App';
import { apiFetch, clearToken, getToken } from './calls/api';

// Komponenty
import Icon from './components/Icons';

// Stránky aplikace
import VenueList from './screens/operator/VenueList';
import VenueForm from './screens/operator/VenueForm';
import VenueDetail from './screens/operator/VenueDetail';
import SportsGroundDetail from './screens/operator/SportsGroundDetail';
import SearchResults from './screens/athlete/SearchResults';

// Styly
import './style.css';

// ==========================================
// HLAVNÍ ROZLOŽENÍ APLIKACE
// ==========================================

// Hlídá přístup: bez přihlášení (bez tokenu) přesměruje na přihlašovací stránku
function RequireAuth({ children }) {
  if (!getToken()) {
    return <Navigate to="/prihlaseni" replace />;
  }
  return children;
}

function Layout() {

  const navigate = useNavigate();

  // Přihlášený uživatel (jméno a role v dolní části menu)
  const [me, setMe] = useState(null);

  useEffect(() => {
    apiFetch('/auth/user/getMe')
      .then((data) => setMe(data.user || data))
      .catch((e) => {
        // Token vypršel nebo není platný -> odhlásit a poslat na přihlášení
        if (e.status === 401) {
          clearToken();
          navigate('/prihlaseni', { replace: true });
        }
      });
  }, []);

  const odhlasit = () => {
    clearToken();
    navigate('/prihlaseni', { replace: true });
  };

  const initials = me
    ? `${me.firstName?.[0] || ''}${me.surName?.[0] || ''}`.toUpperCase()
    : '';

  return (
    <div className="app">

      {/* ====================================
          BOČNÍ MENU
      ==================================== */}

      <aside className="sidebar">

        {/* LOGO PLAY SPOT */}

        
        <Link className="brand" to="/arealy">
        <img
            src={playspotLogo}
            alt="PLAY SPOT"
            className="playspot-logo"
        />
        </Link>


        {/* NAVIGACE */}

        <nav aria-label="Hlavní navigace">

          {/* PŘEHLED */}

          <span
            className="nav-link disabled"
            title="Přehled bude dostupný později"
          >
            <Icon name="home" size={16} />
            Přehled
            <span className="nav-count">2</span>
          </span>

          {/* AREÁLY */}

          <NavLink
            to="/arealy"
            className={({ isActive }) =>
              'nav-link ' + (isActive ? 'active' : '')
            }
          >
            <Icon name="pin" size={21} />
            Areály
          </NavLink>

          {/* PROFIL */}

          <span
            className="nav-link disabled"
            title="Profil bude dostupný později"
          >
            <Icon name="user" size={21} />
            Profil
          </span>

        </nav>

        {/* ==================================
            PROFIL PROVOZOVATELE
        ================================== */}

        
        <div className="sidebar-footer">

        <span className="avatar">{initials}</span>

        <div className="sidebar-user-info">
            <strong>{me ? `${me.firstName} ${me.surName}` : ''}</strong>
            <small>{me?.role === 'operator' ? 'Provozovatel' : me?.role === 'athlete' ? 'Sportovec' : ''}</small>
        </div>

        <span
          className="sidebar-logout"
          title="Odhlásit se"
          role="button"
          tabIndex={0}
          onClick={odhlasit}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') odhlasit(); }}
        >
            <Icon name="logout" size={19} />
        </span>

        </div>


      </aside>

      {/* ====================================
          HLAVNÍ ČÁST APLIKACE
      ==================================== */}

      <div className="main">


        {/* ==================================
            OBSAH APLIKACE
        ================================== */}

        <main className="content">

          <Routes>

            {/* Výchozí přesměrování */}
            <Route
              path="/"
              element={<Navigate to="/arealy" replace />}
            />

            {/* Seznam areálů */}
            <Route
              path="/arealy"
              element={<VenueList />}
            />

            {/* Vytvoření nového areálu */}
            <Route
              path="/arealy/novy"
              element={<VenueForm />}
            />

            {/* Úprava existujícího areálu */}
            <Route
              path="/arealy/:id/upravit"
              element={<VenueForm key="edit" />}
            />

            {/* Detail sportoviště – otevírací doba, ceník a náhled slotů */}
            <Route
              path="/arealy/:id/sportoviste/:sportsGroundId"
              element={<SportsGroundDetail />}
            />

            {/* Detail konkrétního areálu */}
            <Route
              path="/arealy/:id"
              element={<VenueDetail />}
            />

            {/* Neznámá URL */}
            <Route
              path="*"
              element={<Navigate to="/arealy" replace />}
            />

          </Routes>

        </main>

      </div>

    </div>
  );
}

// ==========================================
// SPUŠTĚNÍ REACT APLIKACE
// ==========================================

function Root() {
  return (
    <Routes>

      {/* Přihlášení, registrace, obnova hesla a úvodní stránka sportovce.
          Všechny cesty sdílí jednu komponentu App, takže se její stav nezahazuje při přepínání. */}
      <Route element={<App />}>
        <Route path="/prihlaseni" element={null} />
        <Route path="/registrace" element={null} />
        <Route path="/registrace/role" element={null} />
        <Route path="/zapomenute-heslo" element={null} />
        <Route path="/obnova-hesla/:token" element={null} />
        <Route path="/hledat" element={null} />
      </Route>

      {/* Výsledky vyhledávání (sportovec) – má vlastní horní lištu, proto
          stojí mimo Layout s bočním panelem provozovatele.
          Pozor: kdyby se cesta /hledat výše změnila na "/hledat/*",
          přebila by tuhle obrazovku komponenta App. */}
      <Route
        path="/hledat/vysledky"
        element={
          <RequireAuth>
            <SearchResults />
          </RequireAuth>
        }
      />

      {/* Zbytek aplikace (správa areálů) je jen pro přihlášené */}
      <Route
        path="*"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      />

    </Routes>
  );
}

createRoot(
  document.getElementById('root')
).render(
  <BrowserRouter>
    <Root />
  </BrowserRouter>
);
