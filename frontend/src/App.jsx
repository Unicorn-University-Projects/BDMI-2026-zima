import { useState } from 'react';

function App() {
  const [aktualniStranka, setAktualniStranka] = useState('uvod');

  const navigujNa = (stranka) => {
    setAktualniStranka(stranka);
  };

  const styly = {
    kontejner: { fontFamily: 'Arial, sans-serif', color: '#333', margin: 0, padding: 0 },
    hlavicka: { backgroundColor: '#2f1c6a', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' },
    logo: { fontSize: '24px', fontWeight: 'bold', letterSpacing: '1px' },
    navigace: { display: 'flex', gap: '20px' },
    tlacitkoNav: { background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: '16px', padding: '5px 10px', transition: '0.3s' },
    tlacitkoAktivni: { color: '#fff', borderBottom: '2px solid #fff', fontWeight: 'bold' },
    hlavniObsah: { padding: '40px', maxWidth: '800px', margin: '0 auto', lineHeight: '1.6' },
    karta: { background: '#f9f9f9', border: '1px solid #ddd', padding: '20px', borderRadius: '8px', marginTop: '20px' }
  };

  return (
    <div style={styly.kontejner}>
      <header style={styly.hlavicka}>
        <div style={styly.logo}>PLAYSPOT</div>
        <nav style={styly.navigace}>
          <button 
            style={{...styly.tlacitkoNav, ...(aktualniStranka === 'uvod' ? styly.tlacitkoAktivni : {})}} 
            onClick={() => navigujNa('uvod')}
          >
            Domů
          </button>
          <button 
            style={{...styly.tlacitkoNav, ...(aktualniStranka === 'vyhledavani' ? styly.tlacitkoAktivni : {})}} 
            onClick={() => navigujNa('vyhledavani')}
          >
            Vyhledat sportoviště
          </button>
          <button 
            style={{...styly.tlacitkoNav, ...(aktualniStranka === 'rezervace' ? styly.tlacitkoAktivni : {})}} 
            onClick={() => navigujNa('rezervace')}
          >
            Moje rezervace
          </button>
          <button 
            style={{...styly.tlacitkoNav, ...(aktualniStranka === 'sprava' ? styly.tlacitkoAktivni : {})}} 
            onClick={() => navigujNa('sprava')}
          >
            Správa areálů
          </button>
          <button 
            style={{...styly.tlacitkoNav, ...(aktualniStranka === 'auth' ? styly.tlacitkoAktivni : {})}} 
            onClick={() => navigujNa('auth')}
          >
            Přihlášení / Registrace
          </button>
        </nav>
      </header>

      <main style={styly.hlavniObsah}>
        {aktualniStranka === 'uvod' && (
          <div>
            <h1>Vítejte v systému PLAYSPOT</h1>
            <p>Tato aplikace slouží k online rezervaci sportovišť pro sportovce a správu areálů pro provozovatele.</p>
            <div style={styly.karta}>
              <h3>Stav vývoje (Sprint 1)</h3>
              <p>Aktuálně je nasazena základní struktura frontendu a navigační kostra. Všechny sekce jsou připraveny pro implementaci funkčností v dalších fázích projektu.</p>
            </div>
          </div>
        )}

        {aktualniStranka === 'vyhledavani' && (
          <div>
            <h1>Vyhledat sportoviště</h1>
            <p><em>[Placeholder pro budoucí implementaci]</em></p>
            <div style={styly.karta}>
              <p>Zde bude vyhledávací formulář (podle Business Requests bod 1 a 2):</p>
              <ul>
                <li>Vyhledávání podle sportu, města a data</li>
                <li>Zobrazení detailu a kalendáře dostupnosti</li>
              </ul>
            </div>
          </div>
        )}

        {aktualniStranka === 'rezervace' && (
          <div>
            <h1>Moje rezervace a historie</h1>
            <p><em>[Placeholder pro budoucí implementaci]</em></p>
            <div style={styly.karta}>
              <p>Zde bude klientská zóna pro sportovce (podle Business Requests bod 3, 4, 5 a 10):</p>
              <ul>
                <li>Přehled aktuálních rezervací s možností stornování (pravidlo 24h)</li>
                <li>Historie proběhlých rezervací</li>
                <li>Formulář pro hodnocení sportoviště po hře</li>
              </ul>
            </div>
          </div>
        )}

        {aktualniStranka === 'sprava' && (
          <div>
            <h1>Správa areálů (Provozovatel)</h1>
            <p><em>[Placeholder pro budoucí implementaci]</em></p>
            <div style={styly.karta}>
              <p>Zde bude administrační rozhraní (podle Business Requests bod 6, 7, 8 a 9):</p>
              <ul>
                <li>Vytvoření a editace sportovního areálu</li>
                <li>Nastavení otevírací doby a hodinových slotů</li>
                <li>Nastavení ceníků za slot</li>
                <li>Schvalování, zamítání a stornování rezervací ze strany provozovatele</li>
              </ul>
            </div>
          </div>
        )}

        {aktualniStranka === 'auth' && (
          <div>
            <h1>Přihlášení a registrace</h1>
            <p><em>[Placeholder pro budoucí implementaci podle obdrženého designu]</em></p>
            <div style={styly.karta}>
              <p>Zde bude implementován registrační a přihlašovací formulář, který odpovídá zaslanému wireframu / Figmě:</p>
              <ul>
                <li>Možnost registrace e-mailem nebo přes Google/Apple/Facebook</li>
                <li>Výběr uživatelské role při registraci (Sportovec vs. Provozovatel areálu)</li>
                <li>Zabezpečené přihlášení a správa relace (session)</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

