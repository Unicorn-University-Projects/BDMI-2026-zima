import { useState, useEffect } from 'react';
import './App.css';

// Adresa API gateway (backend na portu 4000)
// Adresa gateway se čte z frontend/.env (VITE_API_URL); když chybí, použije se localhost:4000
const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/auth`;

// Token pro reset hesla chodí v odkazu z e-mailu: https://tvuj-web/?token=...
// Podle analýzy je odkaz ve tvaru /obnova-hesla/<token>; ?token=... necháváme jako záložní variantu
const RESET_TOKEN = (() => {
  const m = window.location.pathname.match(/^\/obnova-hesla\/([^/]+)/);
  return m ? m[1] : new URLSearchParams(window.location.search).get('token');
})();

// ==================================================
// IKONY (jednoduché inline SVG, aby nebylo potřeba žádné knihovny)
// ==================================================
const ICONS = {
  mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 8 8 5 8-5" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /><path d="M3 3l18 18" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  arena: <><path d="M4 20h16" /><path d="M6 20c0-7 3-12 6-12s6 5 6 12" /><path d="M9 20c0-4 1.2-7 3-7s3 3 3 7" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />,
  pin: <><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16.5h.01" /></>,
  checkBox: <><rect x="3" y="3" width="18" height="18" rx="4" /><path d="m8 12 3 3 5-6" /></>,
  check: <path d="m5 12 5 5 9-10" />,
  bell: <><path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7Z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  grid: <><rect x="4" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" /></>,
  ticket: <><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z" /><path d="M14 6v12" strokeDasharray="2 2" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
};

function Icon({ name, size = 18, strokeWidth = 1.7 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

// ==================================================
// LOGO
// ==================================================
function Logo() {
  return (
    <div className="ps-logo">
      <div className="ps-logo-mark"><Icon name="calendar" size={16} strokeWidth={2.2} /></div>
      <div className="ps-logo-text">PLAY <span>SPOT</span></div>
    </div>
  );
}

// ==================================================
// LOGA SOCIÁLNÍCH SÍTÍ
// ==================================================
const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
    <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3.1-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
);
const MicrosoftLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="2" y="2" width="9.5" height="9.5" fill="#F25022" />
    <rect x="12.5" y="2" width="9.5" height="9.5" fill="#7FBA00" />
    <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF" />
    <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900" />
  </svg>
);

// ==================================================
// ILUSTRACE SPORTŮ (pravý panel)
// ==================================================
function SportsIllustration() {
  const p = { fill: 'none', stroke: '#c9bdfb', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' };
  return (
    <svg className="ps-illu" viewBox="0 0 520 300" aria-hidden="true">
      <defs>
        <clipPath id="racketClip"><ellipse cx="0" cy="0" rx="40" ry="52" /></clipPath>
      </defs>
      {/* tenisový míček */}
      <g {...p}>
        <circle cx="62" cy="66" r="31" />
        <path d="M40 46c12 7 17 19 15 34" />
        <path d="M84 86c-12-7-17-19-15-34" />
      </g>
      {/* raketa */}
      <g {...p} transform="translate(250 70) rotate(18)">
        <ellipse cx="0" cy="0" rx="40" ry="52" />
        <g clipPath="url(#racketClip)">
          <path d="M-40 -26H40M-40 -8H40M-40 10H40M-40 28H40" />
          <path d="M-24 -52V52M-8 -52V52M8 -52V52M24 -52V52" />
        </g>
        <path d="M0 52V120" />
      </g>
      {/* basketbalový míč */}
      <g {...p}>
        <circle cx="452" cy="118" r="40" />
        <path d="M452 78V158M412 118H492" />
        <path d="M424 90c14 12 14 44 0 56" />
        <path d="M480 90c-14 12-14 44 0 56" />
      </g>
      {/* košíček (badminton) */}
      <g {...p}>
        <path d="M100 130l16 52M122 126l-2 56M146 132l-24 50" />
        <path d="M100 130q23-10 46 2" />
        <circle cx="118" cy="190" r="7" />
      </g>
      {/* fotbalový míč */}
      <g {...p}>
        <circle cx="305" cy="232" r="32" />
        <path d="M305 214l16 12-6 19h-20l-6-19z" />
        <path d="M305 214v-14M321 226l13-5M315 245l8 12M295 245l-8 12M289 226l-13-5" />
      </g>
    </svg>
  );
}

// ==================================================
// PRAVÝ REKLAMNÍ PANEL
// ==================================================
function PromoPanel() {
  return (
    <aside className="ps-right">
      <SportsIllustration />
      <div className="ps-promo">
        <h2>Najdi volné sportoviště a zarezervuj si ho během pár vteřin.</h2>
        <p>Tenis, fotbal, badminton i curling ve tvém městě.</p>
        <ul className="ps-bullets">
          <li><span className="ps-bullet-ico"><Icon name="calendar" size={16} /></span>Volné termíny všech areálů na jednom místě</li>
          <li><span className="ps-bullet-ico"><Icon name="phone" size={16} /></span>Rezervace bez telefonování</li>
          <li><span className="ps-bullet-ico"><Icon name="pin" size={16} /></span>Sportoviště ve tvém městě</li>
        </ul>
      </div>
    </aside>
  );
}

// ==================================================
// OPAKOVANĚ POUŽITÉ KOMPONENTY FORMULÁŘE
// (musí být mimo App, jinak by se input při každém psaní znovu vytvořil a ztratil fokus)
// ==================================================
function Field({ label, icon, type = 'text', value, onChange, placeholder, error, hint, autoComplete, required = true }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="ps-field">
      <label className="ps-label">{label}</label>
      <div className={`ps-input-wrap${error ? ' err' : ''}`}>
        <Icon name={icon} size={16} />
        <input
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          maxLength={isPassword ? 72 : undefined}
        />
        {isPassword && (
          <button type="button" className="ps-eye" onClick={() => setShow(!show)} aria-label={show ? 'Skrýt heslo' : 'Zobrazit heslo'}>
            <Icon name={show ? 'eyeOff' : 'eye'} size={16} />
          </button>
        )}
      </div>
      {hint && <span className="ps-hint">{hint}</span>}
    </div>
  );
}

function Alert({ type, children }) {
  if (!children) return null;
  const icon = type === 'error' ? 'alert' : type === 'success' ? 'checkBox' : 'info';
  return (
    <div className={`ps-alert ${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon name={icon} size={15} />
      <span>{children}</span>
    </div>
  );
}

function RoleCard({ active, icon, title, text, onClick }) {
  return (
    <button type="button" className={`ps-role${active ? ' active' : ''}`} onClick={onClick}>
      <span className="ps-role-ico"><Icon name={icon} size={18} /></span>
      <span className="ps-role-txt"><strong>{title}</strong><small>{text}</small></span>
      <span className="ps-radio" />
    </button>
  );
}

function Checkbox({ checked, onChange, children }) {
  return (
    <label className="ps-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="ps-check-box">{checked && <Icon name="check" size={12} strokeWidth={3} />}</span>
      <span>{children}</span>
    </label>
  );
}

// ==================================================
// LOGO POSKYTOVATELE se zeleným zatržítkem (obrazovka "Ještě jedna věc")
// ==================================================
function ProviderBadge({ provider }) {
  const Logo = provider === 'microsoft' ? MicrosoftLogo : GoogleLogo;
  return (
    <div className="ps-prov" aria-hidden="true">
      <Logo />
      <span className="ps-prov-check"><Icon name="check" size={10} strokeWidth={3.2} /></span>
    </div>
  );
}

// ==================================================
// POMŮCKA PRO VÝVOJ: rychlé přepínání obrazovek bez backendu
// Zobrazuje se jen při `npm run dev`, v ostré verzi (npm run build) se neobjeví.
// ==================================================
const NAHLEDY = [
  ['login', 'Přihlášení'],
  ['loginError', 'Přihlášení – chyba'],
  ['emailExists', 'Přihlášení – e-mail už registrován'],
  ['passwordChanged', 'Přihlášení – heslo změněno'],
  ['register', 'Registrace'],
  ['roleGoogle', 'Volba role – Google'],
  ['roleMicrosoft', 'Volba role – Microsoft'],
  ['forgot', 'Zapomenuté heslo'],
  ['checkEmail', 'Odkaz odeslán'],
  ['reset', 'Nové heslo'],
  ['expired', 'Odkaz vypršel'],
  ['home', 'Úvod po přihlášení'],
];

function DevBar({ onSelect }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ps-dev">
      {open && (
        <div className="ps-dev-list">
          <div className="ps-dev-title">Náhled obrazovek (jen pro vývoj)</div>
          {NAHLEDY.map(([key, nazev]) => (
            <button key={key} type="button" className="ps-dev-item" onClick={() => { onSelect(key); setOpen(false); }}>{nazev}</button>
          ))}
        </div>
      )}
      <button type="button" className="ps-dev-toggle" onClick={() => setOpen(!open)}>{open ? 'Zavřít' : 'Náhled obrazovek'}</button>
    </div>
  );
}

// ==================================================
// HLAVNÍ KOMPONENTA
// ==================================================
function App() {
  // --- NAVIGACE ---
  // login | register | forgot | checkEmail | reset | expired | home
  const [screen, setScreen] = useState(RESET_TOKEN ? 'reset' : 'login');
  const [token, setToken] = useState(sessionStorage.getItem('token') || null);
  const [uzivatel, setUzivatel] = useState(null);
  const [nacitam, setNacitam] = useState(Boolean(sessionStorage.getItem('token')));

  // --- FORMULÁŘE ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [firstName, setFirstName] = useState('');
  const [surName, setSurName] = useState('');
  const [role, setRole] = useState('athlete'); // athlete = Sportovec, operator = Provozovatel
  const [termsAccepted, setTermsAccepted] = useState(false);
  // Volba role po přihlášení přes poskytovatele (zatím jen příprava, bez funkčnosti)
  const [provider, setProvider] = useState('google'); // google | microsoft
  const [providerEmail, setProviderEmail] = useState('');

  // --- OZNÁMENÍ ---
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [passwordError, setPasswordError] = useState(false); // červené ohraničení pole hesla
  const [odesilam, setOdesilam] = useState(false);
  const [toast, setToast] = useState('');

  // --- HOME (vyhledávání) ---
  const [sport, setSport] = useState('');
  const [lokalita, setLokalita] = useState('');

  // Při startu: když je v prohlížeči token, ověříme ho u backendu
  useEffect(() => {
    if (token) nactiUzivatele(token);
  }, [token]);

  // Toast zmizí po 4 s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const vycistitZpravy = () => {
    setErrorMsg('');
    setSuccessMsg('');
    setPasswordError(false);
  };

  const prejit = (novaObrazovka) => {
    vycistitZpravy();
    setPassword('');
    setPassword2('');
    setScreen(novaObrazovka);
  };

  const nactiUzivatele = async (aktualniToken) => {
    try {
      const res = await fetch(`${API_URL}/user/getMe`, {
        headers: { Authorization: `Bearer ${aktualniToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const u = data.user || data; // odpověď může být { user: {...} } nebo přímo uživatel
        setUzivatel(u);
        setScreen('home');
        setToast(`Vítej v PlaySpotu, ${u.firstName}!`);
      } else {
        const text = await res.text().catch(() => '');
        console.error('getMe selhalo:', res.status, text);
        odhlasit();
        setErrorMsg(`Přihlášení se nepodařilo ověřit (chyba ${res.status}). Zkus to prosím znovu.`);
      }
    } catch (err) {
      console.error('Chyba při načítání uživatele', err);
      setErrorMsg('Nelze se spojit se serverem.');
    } finally {
      setNacitam(false);
    }
  };

  const odhlasit = () => {
    sessionStorage.removeItem('token');
    setToken(null);
    setUzivatel(null);
    setPassword('');
    vycistitZpravy();
    setScreen('login');
  };

  // --- PŘIHLÁŠENÍ: POST /user/signIn ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setPasswordError(false);
    setOdesilam(true);
    try {
      const res = await fetch(`${API_URL}/user/signIn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.token) {
        sessionStorage.setItem('token', data.token);
        setToken(data.token); // useEffect si pak načte uživatele
      } else if (res.status === 429) {
        setErrorMsg('Příliš mnoho pokusů o přihlášení. Zkus to prosím za chvíli.');
      } else {
        setErrorMsg('Nesprávný e-mail nebo heslo. Zkus to znovu, nebo si obnov heslo.');
        setPasswordError(true);
      }
    } catch (err) {
      setErrorMsg('Nelze se spojit se serverem. Běží backend na portu 4000?');
    } finally {
      setOdesilam(false);
    }
  };

  // --- REGISTRACE: POST /user/register ---
  const handleRegister = async (e) => {
    e.preventDefault();
    vycistitZpravy();

    if (password.length < 8) {
      setErrorMsg('Heslo musí mít alespoň 8 znaků.');
      setPasswordError(true);
      return;
    }
    if (!termsAccepted) {
      setErrorMsg('Musíš souhlasit s podmínkami používání.');
      return;
    }

    setOdesilam(true);
    try {
      const res = await fetch(`${API_URL}/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, surName, email, password, role, termsAccepted }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.token) {
        // Backend po registraci rovnou vrací token -> uživatel je přihlášený
        sessionStorage.setItem('token', data.token);
        setPassword('');
        setToken(data.token); // useEffect načte uživatele a zobrazí home
      } else if (res.ok) {
        setPassword('');
        setSuccessMsg('Účet byl úspěšně vytvořen! Nyní se můžeš přihlásit.');
        setScreen('login');
      } else if (res.status === 409) {
        // E-mail už existuje -> obrazovka "Přihlášení – e-mail už registrován" z Figmy
        setPassword('');
        setErrorMsg(`E-mail ${email} už je registrovaný. Přihlas se původním způsobem.`);
        setScreen('login');
      } else {
        setErrorMsg(data.message || 'Registrace se nezdařila. Zkus to prosím znovu.');
      }
    } catch (err) {
      setErrorMsg('Nelze se spojit se serverem. Běží backend na portu 4000?');
    } finally {
      setOdesilam(false);
    }
  };

  // --- ŽÁDOST O OBNOVU HESLA: POST /user/requestPasswordReset ---
  const poslatOdkaz = async () => {
    setOdesilam(true);
    try {
      const res = await fetch(`${API_URL}/user/requestPasswordReset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return res.ok;
    } catch (err) {
      return false;
    } finally {
      setOdesilam(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    vycistitZpravy();
    const ok = await poslatOdkaz();
    if (ok) setScreen('checkEmail');
    else setErrorMsg('Došlo k chybě při zpracování požadavku. Zkus to prosím znovu.');
  };

  const poslatZnovu = async () => {
    vycistitZpravy();
    const ok = await poslatOdkaz();
    if (ok) setSuccessMsg('Odkaz jsme poslali znovu.');
    else setErrorMsg('Odkaz se nepodařilo odeslat. Zkus to prosím znovu.');
  };

  // --- NASTAVENÍ NOVÉHO HESLA: POST /user/resetPassword { token, newPassword } ---
  const handleResetPassword = async (e) => {
    e.preventDefault();
    vycistitZpravy();

    if (password.length < 8) {
      setErrorMsg('Heslo musí mít alespoň 8 znaků.');
      setPasswordError(true);
      return;
    }
    if (password !== password2) {
      setErrorMsg('Hesla se neshodují.');
      setPasswordError(true);
      return;
    }

    setOdesilam(true);
    try {
      const res = await fetch(`${API_URL}/user/resetPassword`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: RESET_TOKEN, newPassword: password }),
      });
      if (res.ok) {
        // odstraníme token z adresy a půjdeme na login s hláškou "Heslo je změněné"
        window.history.replaceState({}, '', '/');
        setPassword('');
        setPassword2('');
        setSuccessMsg('Heslo je změněné. Přihlas se novým heslem.');
        setScreen('login');
      } else {
        setScreen('expired');
      }
    } catch (err) {
      setErrorMsg('Nelze se spojit se serverem.');
    } finally {
      setOdesilam(false);
    }
  };

  const handleSocial = (nazev) => {
    vycistitZpravy();
    setErrorMsg(`Přihlášení přes ${nazev} zatím není dostupné.`);
  };

  // --- VOLBA ROLE PO PŘIHLÁŠENÍ PŘES POSKYTOVATELE ---
  // PŘIPRAVENO, ZATÍM BEZ FUNKČNOSTI. Až bude hotové přihlášení přes poskytovatele,
  // sem patří: POST /user/setRole { role, termsAccepted } s hlavičkou Authorization: Bearer <token>.
  // Backend vrátí NOVÝ token (starý roli neobsahuje) -> uložit do sessionStorage a setToken(...).
  const handleRoleChoice = (e) => {
    e.preventDefault();
    vycistitZpravy();
    if (!termsAccepted) {
      setErrorMsg('Musíš souhlasit s podmínkami používání.');
      return;
    }
    setErrorMsg('Dokončení přihlášení přes poskytovatele zatím není dostupné.');
  };

  // Přepnutí na zvolenou obrazovku s ukázkovými daty (bez backendu)
  const nahled = (key) => {
    vycistitZpravy();
    setPassword('');
    setPassword2('');
    const ukazkovyEmail = 'petra.dvorakova@email.cz';
    setTermsAccepted(false);
    setRole('athlete');
    switch (key) {
      case 'roleGoogle':
      case 'roleMicrosoft': {
        const p = key.replace('role', '').toLowerCase();
        setProvider(p);
        setProviderEmail(p === 'google' ? 'petra.dvorakova@gmail.com' : 'petra.dvorakova@outlook.com');
        setTermsAccepted(true); // ve Figmě je ukázka se zaškrtnutým souhlasem
        setScreen('roleChoice');
        break;
      }
      case 'loginError':
        setEmail(ukazkovyEmail);
        setPassword('heslo1234');
        setErrorMsg('Nesprávný e-mail nebo heslo. Zkus to znovu, nebo si obnov heslo.');
        setPasswordError(true);
        setScreen('login');
        break;
      case 'emailExists':
        setEmail('petra.dvorakova@gmail.com');
        setErrorMsg('E-mail petra.dvorakova@gmail.com už je registrovaný. Přihlas se původním způsobem.');
        setScreen('login');
        break;
      case 'passwordChanged':
        setEmail(ukazkovyEmail);
        setSuccessMsg('Heslo je změněné. Přihlas se novým heslem.');
        setScreen('login');
        break;
      case 'checkEmail':
        setEmail(ukazkovyEmail);
        setScreen('checkEmail');
        break;
      case 'forgot':
        setEmail(ukazkovyEmail);
        setScreen('forgot');
        break;
      case 'reset':
        setEmail(ukazkovyEmail);
        setScreen('reset');
        break;
      case 'home':
        setUzivatel({ firstName: 'Petra', surName: 'Dvořáková', role: 'athlete' });
        setToast('Vítej v PlaySpotu, Petra!');
        setScreen('home');
        break;
      default:
        setScreen(key); // login, register, expired
    }
  };

  // ==================================================
  // OBRAZOVKA: PO PŘIHLÁŠENÍ
  // ==================================================
  if (nacitam) return <div className="ps" />;

  if (screen === 'home') {
    const initials = `${uzivatel?.firstName?.[0] || ''}${uzivatel?.surName?.[0] || ''}`.toUpperCase();
    const dnes = new Date().toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric' });
    const oblibene = ['Tenis', 'Fotbal', 'Badminton', 'Squash', 'Curling'];

    return (
      <div className="ps ps-home">
        <header className="ps-nav">
          <div className="ps-nav-left">
            <Logo />
            <nav className="ps-tabs">
              <button className="ps-tab active">Hledat</button>
              <button className="ps-tab">Moje rezervace</button>
              {uzivatel?.role === 'operator' && <button className="ps-tab">Správa areálů</button>}
            </nav>
          </div>
          <div className="ps-nav-right">
            <button className="ps-bell" aria-label="Oznámení"><Icon name="bell" size={18} /></button>
            <span className="ps-avatar" title={`${uzivatel?.firstName || ''} ${uzivatel?.surName || ''}`}>{initials}</span>
            <button className="ps-logout" onClick={odhlasit}>Odhlásit se</button>
          </div>
        </header>

        <main>
          <section className="ps-hero">
            <small>Ahoj, {uzivatel?.firstName}</small>
            <h1>Kde si dnes zahraješ?</h1>

            <form className="ps-search" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="ps-label">Sport *</label>
                <div className="ps-input-wrap">
                  <Icon name="grid" size={15} />
                  <select value={sport} onChange={(e) => setSport(e.target.value)}>
                    <option value="">Vyber sport</option>
                    {oblibene.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <Icon name="chevron" size={14} />
                </div>
              </div>
              <div>
                <label className="ps-label">Lokalita *</label>
                <div className="ps-input-wrap">
                  <Icon name="pin" size={15} />
                  <input type="text" placeholder="Např. Praha" value={lokalita} onChange={(e) => setLokalita(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="ps-label">Datum *</label>
                <div className="ps-input-wrap">
                  <Icon name="calendar" size={15} />
                  <select defaultValue="dnes"><option value="dnes">Dnes, {dnes}</option></select>
                  <Icon name="chevron" size={14} />
                </div>
              </div>
              <button type="submit" className="ps-btn"><Icon name="search" size={14} strokeWidth={2.2} />Hledat</button>
            </form>

            <div className="ps-chips">
              <span>Oblíbené:</span>
              {oblibene.map((s) => (
                <button key={s} type="button" className={`ps-chip${sport === s ? ' active' : ''}`} onClick={() => setSport(s)}>{s}</button>
              ))}
            </div>
          </section>

          <section className="ps-steps">
            <div className="ps-step">
              <div className="ps-step-ico"><Icon name="search" size={16} /></div>
              <h3>Vyber sport a město</h3>
              <p>Uvidíš všechna sportoviště v okolí na jednom místě.</p>
            </div>
            <div className="ps-step">
              <div className="ps-step-ico"><Icon name="calendar" size={16} /></div>
              <h3>Najdi volný termín</h3>
              <p>Volné hodiny a ceny vidíš hned, bez telefonování.</p>
            </div>
            <div className="ps-step">
              <div className="ps-step-ico"><Icon name="ticket" size={16} /></div>
              <h3>Zarezervuj</h3>
              <p>Provozovatel rezervaci potvrdí a dáme ti vědět.</p>
            </div>
          </section>
        </main>

        {toast && (
          <div className="ps-toast" role="status">
            <Icon name="checkBox" size={14} />
            {toast}
          </div>
        )}
        {import.meta.env.DEV && <DevBar onSelect={nahled} />}
      </div>
    );
  }

  // ==================================================
  // OBRAZOVKY: PŘIHLÁŠENÍ / REGISTRACE / OBNOVA HESLA
  // ==================================================
  // Podle analýzy a Figmy jsou tlačítka Google/Microsoft jen na přihlašovací obrazovce
  const zobrazitSocialni = screen === 'login';

  return (
    <div className="ps ps-auth">
      <div className="ps-left">
        <Logo />

        <div className="ps-left-main">
          <div className="ps-form-wrap">

            {/* ---------- PŘIHLÁŠENÍ ---------- */}
            {screen === 'login' && (
              <form onSubmit={handleLogin}>
                <h1 className="ps-h1">Přihlas se</h1>
                <p className="ps-sub">Rezervuj sportoviště během pár vteřin.</p>

                <Alert type="error">{errorMsg}</Alert>
                <Alert type="success">{successMsg}</Alert>

                <Field label="E-mail" icon="mail" type="email" value={email} onChange={setEmail}
                  placeholder="např. petra@email.cz" autoComplete="email" />
                <Field label="Heslo" icon="lock" type="password" value={password} onChange={setPassword}
                  placeholder="Zadej heslo" autoComplete="current-password" error={passwordError} />

                <button type="button" className="ps-link ps-forgot" onClick={() => prejit('forgot')}>Zapomenuté heslo?</button>
                <button type="submit" className="ps-btn" disabled={odesilam}>Přihlásit se</button>
              </form>
            )}

            {/* ---------- REGISTRACE ---------- */}
            {screen === 'register' && (
              <form onSubmit={handleRegister}>
                <h1 className="ps-h1">Vytvoř si účet</h1>
                <p className="ps-sub">Pár údajů a můžeš začít rezervovat.</p>

                <Alert type="error">{errorMsg}</Alert>

                <div className="ps-row">
                  <Field label="Jméno" icon="user" value={firstName} onChange={setFirstName} placeholder="např. Petra" autoComplete="given-name" />
                  <Field label="Příjmení" icon="user" value={surName} onChange={setSurName} placeholder="např. Dvořáková" autoComplete="family-name" />
                </div>
                <Field label="E-mail" icon="mail" type="email" value={email} onChange={setEmail}
                  placeholder="např. petra@email.cz" autoComplete="email" />
                <Field label="Heslo" icon="lock" type="password" value={password} onChange={setPassword}
                  placeholder="Zadej heslo" autoComplete="new-password" hint="Aspoň 8 znaků" error={passwordError} />

                <span className="ps-roles-title">Jak budeš aplikaci používat?</span>
                <RoleCard active={role === 'athlete'} icon="search" title="Chci sportovat"
                  text="Hledám volná sportoviště a rezervuji" onClick={() => setRole('athlete')} />
                <RoleCard active={role === 'operator'} icon="arena" title="Provozuji areál"
                  text="Nabízím sportoviště k rezervaci" onClick={() => setRole('operator')} />

                <Checkbox checked={termsAccepted} onChange={setTermsAccepted}>Souhlasím s podmínkami používání</Checkbox>

                <button type="submit" className="ps-btn" disabled={odesilam}>Vytvořit účet</button>
              </form>
            )}

            {/* ---------- ZAPOMENUTÉ HESLO ---------- */}
            {screen === 'forgot' && (
              <form onSubmit={handleForgotPassword}>
                <h1 className="ps-h1">Zapomenuté heslo</h1>
                <p className="ps-sub">Zadej e-mail, se kterým se přihlašuješ. Pošleme ti odkaz na nastavení nového hesla.</p>

                <Alert type="error">{errorMsg}</Alert>

                <Field label="E-mail" icon="mail" type="email" value={email} onChange={setEmail}
                  placeholder="např. petra@email.cz" autoComplete="email" />
                <button type="submit" className="ps-btn" disabled={odesilam}>Poslat odkaz</button>

                <p className="ps-center">Víš heslo? <button type="button" className="ps-link" onClick={() => prejit('login')}>Přihlas se</button></p>
              </form>
            )}

            {/* ---------- ZKONTROLUJ E-MAIL ---------- */}
            {screen === 'checkEmail' && (
              <div>
                <h1 className="ps-h1">Zkontroluj e-mail</h1>
                <p className="ps-sub">Odkaz na nastavení nového hesla jsme poslali na adresu {email}. Platí 60 minut.</p>

                <Alert type="error">{errorMsg}</Alert>
                <Alert type="success">{successMsg}</Alert>

                <div className="ps-alert info"><Icon name="info" size={15} /><span>Nevidíš ho? Podívej se i do složky Spam.</span></div>
                <button type="button" className="ps-btn" onClick={() => prejit('login')}>Zpět na přihlášení</button>

                <p className="ps-center">Nepřišel e-mail? <button type="button" className="ps-link" onClick={poslatZnovu} disabled={odesilam}>Poslat znovu</button></p>
              </div>
            )}

            {/* ---------- NASTAV NOVÉ HESLO ---------- */}
            {screen === 'reset' && (
              <form onSubmit={handleResetPassword}>
                <h1 className="ps-h1">Nastav nové heslo</h1>
                <p className="ps-sub">{email ? `Pro účet ${email}` : 'Zvol si nové heslo ke svému účtu.'}</p>

                <Alert type="error">{errorMsg}</Alert>

                <Field label="Nové heslo" icon="lock" type="password" value={password} onChange={setPassword}
                  placeholder="Zadej nové heslo" autoComplete="new-password" hint="Aspoň 8 znaků" error={passwordError} />
                <Field label="Nové heslo znovu" icon="lock" type="password" value={password2} onChange={setPassword2}
                  placeholder="Zadej heslo ještě jednou" autoComplete="new-password" error={passwordError && password !== password2} />
                <button type="submit" className="ps-btn" disabled={odesilam}>Uložit nové heslo</button>
              </form>
            )}

            {/* ---------- ODKAZ UŽ NEPLATÍ ---------- */}
            {screen === 'expired' && (
              <div>
                <h1 className="ps-h1">Odkaz už neplatí</h1>
                <p className="ps-sub">Odkaz na obnovu hesla vypršel nebo už byl použitý. Pošli si nový – platí 60 minut.</p>

                <Alert type="error">Platnost odkazu skončila.</Alert>

                <button type="button" className="ps-btn" onClick={() => {
                  window.history.replaceState({}, '', '/');
                  prejit('forgot');
                }}>Poslat nový odkaz</button>

                <p className="ps-center">Víš heslo? <button type="button" className="ps-link" onClick={() => {
                  window.history.replaceState({}, '', '/');
                  prejit('login');
                }}>Přihlas se</button></p>
              </div>
            )}

            {/* ---------- JEŠTĚ JEDNA VĚC (volba role po přihlášení přes poskytovatele) ---------- */}
            {screen === 'roleChoice' && (
              <form onSubmit={handleRoleChoice}>
                <ProviderBadge provider={provider} />
                <h1 className="ps-h1">Ještě jedna věc</h1>
                <p className="ps-sub">Účet {providerEmail} je propojený. Jak budeš aplikaci používat?</p>

                <Alert type="error">{errorMsg}</Alert>

                <RoleCard active={role === 'athlete'} icon="search" title="Chci sportovat"
                  text="Hledám volná sportoviště a rezervuji" onClick={() => setRole('athlete')} />
                <RoleCard active={role === 'operator'} icon="arena" title="Provozuji areál"
                  text="Nabízím sportoviště k rezervaci" onClick={() => setRole('operator')} />

                <Checkbox checked={termsAccepted} onChange={setTermsAccepted}>Souhlasím s podmínkami používání</Checkbox>

                <button type="submit" className="ps-btn">Pokračovat</button>
                <p className="ps-center"><button type="button" className="ps-link" onClick={() => prejit('login')}>Použít jiný účet</button></p>
              </form>
            )}

            {/* ---------- SOCIÁLNÍ PŘIHLÁŠENÍ ---------- */}
            {zobrazitSocialni && (
              <>
                <div className="ps-divider">nebo pokračuj přes</div>
                <button type="button" className="ps-social" onClick={() => handleSocial('Google')}><GoogleLogo />Pokračovat přes Google</button>
                <button type="button" className="ps-social" onClick={() => handleSocial('Microsoft')}><MicrosoftLogo />Pokračovat přes Microsoft</button>

                <p className="ps-center">
                  Nemáš účet? <button type="button" className="ps-link" onClick={() => prejit('register')}>Zaregistruj se</button>
                </p>
              </>
            )}

            {/* Pod registrací je jen odkaz zpět na přihlášení (Figma: bez sociálních tlačítek) */}
            {screen === 'register' && (
              <p className="ps-center">
                Už máš účet? <button type="button" className="ps-link" onClick={() => prejit('login')}>Přihlas se</button>
              </p>
            )}
          </div>
        </div>

        <footer className="ps-footer">
          <span>© 2026 PlaySpot</span>
          <a href="#podminky">Podmínky používání</a>
          <a href="#soukromi">Ochrana soukromí</a>
        </footer>
      </div>

      <PromoPanel />
      {import.meta.env.DEV && <DevBar onSelect={nahled} />}
    </div>
  );
}

export default App;
