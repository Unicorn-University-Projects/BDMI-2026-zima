
import React from 'react';

// ==========================================
// SVG IKONY APLIKACE PLAYSPOT
// ==========================================

export default function Icon({
  name,
  size = 20,
  ...props
}) {

  const icons = {

    // ======================================
    // LOGO - KALENDÁŘ
    // ======================================

    calendar: (
      <>
        <rect
          x="3"
          y="5"
          width="18"
          height="16"
          rx="3"
        />

        <path d="M7 3v4M17 3v4M3 10h18" />

        <circle cx="8" cy="14" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="14" r="1" fill="currentColor" stroke="none" />
        <circle cx="16" cy="14" r="1" fill="currentColor" stroke="none" />
        <circle cx="8" cy="17.5" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="17.5" r="1" fill="currentColor" stroke="none" />
      </>
    ),

    // ======================================
    // PŘEHLED - DOMEČEK
    // ======================================

    home: (
      <path
        d="M3 10.5 10.7 4a2 2 0 0 1 2.6 0L21 10.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"
      />
    ),

    // ======================================
    // AREÁLY - PLNÁ ZNAČKA POLOHY
    // ======================================

    pin: (
      <>
        <path
          d="M12 2C7.58 2 4 5.58 4 10c0 5.5 8 12 8 12s8-6.5 8-12c0-4.42-3.58-8-8-8z"
          fill="currentColor"
          stroke="none"
        />

        <circle
          cx="12"
          cy="10"
          r="3"
          fill="white"
          stroke="none"
        />
      </>
    ),

    // ======================================
    // PROFIL - HLAVA A RAMENA
    // ======================================

    user: (
      <>
        <circle
          cx="12"
          cy="7"
          r="4"
        />

        <ellipse
          cx="12"
          cy="19"
          rx="7.5"
          ry="3"
        />
      </>
    ),

    // ======================================
    // BUDOVA - SEZNAM AREÁLŮ
    // ======================================

    building: (
      <>
        <rect
          x="4"
          y="3"
          width="16"
          height="18"
          rx="2"
        />

        <path
          d="M9 21v-5h6v5M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01"
        />
      </>
    ),

    // ======================================
    // BUDOVA - FORMULÁŘ AREÁLU
    // ======================================

    venueForm: (
      <>
        {/* Hlavní budova se šikmou střechou */}
        <path d="M4 20V8L10 3L16 8V20" />

        {/* Vedlejší nižší budova */}
        <path d="M16 12H19L21 15V20" />

        {/* Dveře */}
        <path d="M9 20V14H13V20" />

        {/* Spodní základna */}
        <path d="M2 20H22" />
      </>
    ),

    // ======================================
    // PŘIDAT - PLUS
    // ======================================

    plus: (
      <path d="M12 5v14M5 12h14" />
    ),

    // ======================================
    // VYHLEDÁVÁNÍ - LUPA
    // ======================================

    search: (
      <>
        <circle
          cx="11"
          cy="11"
          r="7"
        />

        <path d="m16 16 5 5" />
      </>
    ),

    // ======================================
    // ŠIPKA ZPĚT
    // ======================================

    arrow: (
      <path d="m15 18-6-6 6-6" />
    ),

    // ======================================
    // TELEFON
    // ======================================

    phone: (
      <path
        d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1-2h3a2 2 0 0 1 2 1.7l.5 3a2 2 0 0 1-.6 1.8L7.1 10a16 16 0 0 0 6.9 6.9l1.5-1.9a2 2 0 0 1 1.8-.6l3 .5a2 2 0 0 1 1.7 2Z"
      />
    ),

    // ======================================
    // E-MAIL
    // ======================================

    mail: (
      <>
        <rect
          x="2"
          y="4"
          width="20"
          height="16"
          rx="3"
        />

        <path d="m3 6 9 7 9-7" />
      </>
    ),

    // ======================================
    // POTVRZENÍ - FAJFA V RÁMEČKU
    // ======================================

    check: (
      <>
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="4"
        />

        <path d="m8 12 3 3 5-6" />
      </>
    ),

    // ======================================
    // UPRAVIT AREÁL - TUŽKA
    // ======================================

    edit: (
      <>
        <path d="M12 20h9" />

        <path
          d="M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4L16.5 3.5z"
        />
      </>
    ),

    // ======================================
    // SPORTOVIŠTĚ - ČTYŘI ČTVERCE
    // ======================================

    grid: (
      <>
        <rect
          x="3"
          y="3"
          width="7"
          height="7"
          rx="2"
        />

        <rect
          x="14"
          y="3"
          width="7"
          height="7"
          rx="2"
        />

        <rect
          x="3"
          y="14"
          width="7"
          height="7"
          rx="2"
        />

        <rect
          x="14"
          y="14"
          width="7"
          height="7"
          rx="2"
        />
      </>
    )

  };

  // ========================================
  // VYKRESLENÍ SVG IKONY
  // ========================================

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {icons[name] || null}
    </svg>
  );
}
