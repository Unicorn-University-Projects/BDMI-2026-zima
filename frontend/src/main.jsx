import playspotLogo from './assets/playspot-logo.png';
import React from 'react';
import { createRoot } from 'react-dom/client';

import {
  BrowserRouter,
  NavLink,
  Link,
  Navigate,
  Route,
  Routes
} from 'react-router-dom';

// Komponenty
import Icon from './components/Icons';

// Stránky aplikace
import VenueList from './pages/VenueList';
import VenueForm from './pages/VenueForm';
import VenueDetail from './pages/VenueDetail';

// Styly
import './style.css';

// ==========================================
// HLAVNÍ ROZLOŽENÍ APLIKACE
// ==========================================

function Layout() {

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

        <span className="avatar">KN</span>

        <div className="sidebar-user-info">
            <strong>Karel Novák</strong>
            <small>Provozovatel</small>
        </div>

        <span className="sidebar-logout" title="Odhlásit se">
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

            {/* Detail areálu */}
            <Route
              path="/arealy/:id"
              element={<VenueDetail />}
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

createRoot(
  document.getElementById('root')
).render(
  <BrowserRouter>
    <Layout />
  </BrowserRouter>
);
