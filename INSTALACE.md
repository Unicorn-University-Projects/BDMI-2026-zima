# Instalace, konfigurace a lokální spuštění

Tento návod popisuje, jak si projekt **Rezervační systém sportovišť (PlaySpot)** stáhnout, nakonfigurovat a spustit na vlastním počítači. Popisuje dvě varianty:

- **Varianta A – Docker Compose:** celý backend včetně databáze MySQL jedním příkazem. Doporučeno pro první spuštění.
- **Varianta B – bez Dockeru (vývojový režim):** každá služba běží samostatně přes `npm start`, což se hodí při vývoji a ladění.

Frontend se v obou variantách spouští zvlášť přes Vite (viz [kapitola 6](#6-spuštění-frontendu)).

---

## 1. Předpoklady

| Nástroj | Verze | Poznámka |
|---|---|---|
| Git | libovolná aktuální | pro stažení repozitáře |
| Node.js | **24 LTS** | obsahuje i `npm`; služby používají přepínač `--env-file-if-exists`, který starší Node nezná |
| Docker Desktop (nebo Docker Engine) | Docker Compose **2.24 a novější** | jen pro variantu A, případně pro spuštění samotné MySQL ve variantě B |
| MySQL 8.0 | – | jen pokud ve variantě B nechcete MySQL z Dockeru |

Kontrola verzí:

```bash
node -v
```

```bash
docker compose version
```

> Na Windows doporučujeme PowerShell nebo Git Bash. Příkazy `cp` v návodu nahraďte v klasickém `cmd` příkazem `copy`.

---

## 2. Stažení projektu

```bash
git clone https://github.com/Unicorn-University-Projects/BDMI-2026-zima.git
```

```bash
cd BDMI-2026-zima
```

---

## 3. Přehled služeb a portů

| Služba | Složka | Port | K čemu slouží |
|---|---|---|---|
| API Gateway | `gateway/` | 4000 | jediný vstupní bod pro frontend, ověřuje JWT a kontroluje oprávnění |
| Auth service | `services/auth/` | 4001 | registrace, přihlášení, role, vydávání JWT |
| Venue service | `services/venue/` | 4002 | areály a sportoviště |
| Booking service | `services/booking/` | 4003 | rezervace (zatím jen kostra s `/health`) |
| Review service | `services/review/` | 4004 | hodnocení (zatím jen kostra s `/health`) |
| Audit service | `services/audit/` | 4005 | interní audit, volají ho jen jiné služby |
| MySQL | (Docker image) | 3306 | databáze `rezervace_sportovist` |
| Frontend | `frontend/` | 5173 | React aplikace (Vite) |

Frontend komunikuje **pouze s gateway** na `http://localhost:4000`. Gateway požadavky přeposílá podle první části cesty, například `/auth/user/register` jde na Auth service jako `/user/register`, `/venue/venue/list` jde na Venue service jako `/venue/list`. Seznam povolených příkazů a rolí je v [gateway/src/permissions.js](gateway/src/permissions.js).

---

## 4. Konfigurace

Každá služba čte konfiguraci ze svého souboru `.env`. Soubory `.env` se **necommitují** (jsou v `.gitignore`), v repozitáři jsou jen vzory `.env.example`.

### 4.1 Vytvoření souborů `.env`

V kořeni projektu spusťte:

```bash
cp gateway/.env.example gateway/.env
```

```bash
cp services/auth/.env.example services/auth/.env
```

```bash
cp services/venue/.env.example services/venue/.env
```

```bash
cp services/audit/.env.example services/audit/.env
```

```bash
cp frontend/.env.example frontend/.env
```

Booking a Review service zatím žádnou konfiguraci nepotřebují.

### 4.2 JWT klíče (povinné)

Auth service podepisuje tokeny **soukromým** RSA klíčem, gateway je ověřuje **veřejným** klíčem. Oba klíče musí tvořit pár. Veřejný klíč ve vzorových souborech patří k týmovému soukromému klíči, který v repozitáři není. Pro lokální běh si proto vygenerujte vlastní pár:

```bash
node -e "const {generateKeyPairSync}=require('crypto');const k=generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});console.log('JWT_PRIVATE_KEY='+Buffer.from(k.privateKey).toString('base64'));console.log('JWT_PUBLIC_KEY='+Buffer.from(k.publicKey).toString('base64'))"
```

Příkaz vypíše dva řádky. Pak:

1. Řádek `JWT_PRIVATE_KEY=...` vložte do `services/auth/.env` (nahraďte `base64-soukromeho-klice`).
2. Řádek `JWT_PUBLIC_KEY=...` vložte **do obou** souborů `services/auth/.env` a `gateway/.env` (nahraďte stávající hodnotu).

Klíče jsou PEM soubory zakódované do base64 na jeden řádek. Pokud se pár neshoduje, gateway vrací na každý chráněný požadavek `401 user/unauthenticated` a v logu vypíše `GATEWAY AUTH ERROR`.

### 4.3 Systémový klíč pro Audit service

Audit service přijímá jen požadavky s hlavičkou `X-System-Key`. Vygenerujte náhodný klíč:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

a vložte ho do `services/audit/.env` jako `SYSTEM_KEY=...`. Stejnou hodnotu budou později potřebovat služby, které audit volají.

### 4.4 Připojení k databázi

Auth a Venue service potřebují MySQL. Hodnoty `DB_*` v `services/auth/.env` a `services/venue/.env` nastavte podle toho, jakou databázi používáte:

| Proměnná | Lokální MySQL z Dockeru, služby přes `npm start` (varianta B) | Vše v Dockeru (varianta A) | Sdílená týmová DB |
|---|---|---|---|
| `DB_HOST` | `127.0.0.1` | nastaví `docker-compose.yml` na `mysql` | adresa ze vzoru |
| `DB_PORT` | `3306` | `3306` | `3306` |
| `DB_USER` | `rezervace_app` | `rezervace_app` | od správce týmu |
| `DB_PASSWORD` | `app_local` | `app_local` | od správce týmu |
| `DB_NAME` | `rezervace_sportovist` | `rezervace_sportovist` | `rezervace_sportovist` |

Uživatele `rezervace_app` s heslem `app_local` a databázi `rezervace_sportovist` vytvoří kontejner MySQL automaticky. Heslo i heslo uživatele `root` lze změnit v souboru `.env` v **kořeni** projektu (ten čte Docker Compose):

```dotenv
MYSQL_ROOT_PASSWORD=root
LOCAL_DB_PASSWORD=app_local
```

Pokud `LOCAL_DB_PASSWORD` změníte, nastavte stejnou hodnotu i do `DB_PASSWORD` v obou službách.

> **Poznámka k variantě A:** `docker-compose.yml` u Auth i Venue service přepisuje `DB_HOST` na `mysql` (název kontejneru databáze). V `.env` proto může zůstat `127.0.0.1` a stejné soubory fungují v obou variantách.

### 4.5 Ostatní proměnné

| Soubor | Proměnná | Výchozí hodnota | Význam |
|---|---|---|---|
| `gateway/.env` | `PORT` | `4000` | port gateway |
| | `FRONTEND_URL` | `http://localhost:5173` | povolený původ pro CORS; musí odpovídat adrese frontendu |
| | `AUTH_URL`, `VENUE_URL`, `BOOKING_URL`, `REVIEW_URL` | `http://127.0.0.1:400x` | adresy služeb (v Dockeru je přepíše `docker-compose.yml`) |
| `services/auth/.env` | `JWT_EXPIRES_IN` | `8h` | platnost tokenu |
| | `FRONTEND_URL` | `http://localhost:5173` | použije se v odkazu pro obnovu hesla |
| | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | nevyplněno | volitelné, přihlášení přes Google |
| | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_REDIRECT_URI` | nevyplněno | volitelné, přihlášení přes Microsoft |
| `frontend/.env` | `VITE_API_URL` | `http://localhost:4000` | adresa gateway, kterou volá frontend |

Bez vyplněných OAuth proměnných vrací `signInWithProvider` chybu `providerNotSupported`. Registrace a přihlášení e-mailem a heslem fungují i bez nich.

---

## 5. Spuštění backendu

### Varianta A – Docker Compose

1. Mějte spuštěný Docker Desktop.
2. Zkontrolujte konfiguraci podle kapitoly 4 (JWT klíče, `DB_PASSWORD=app_local`).
3. V kořeni projektu spusťte:

```bash
docker compose up --build
```

Docker sestaví image všech služeb, spustí MySQL a při **prvním** startu (prázdný volume) do ní nahraje tabulky ze souborů `services/auth/db/init.sql` a `services/venue/db/init.sql`.

MySQL se při prvním startu inicializuje zhruba 10 až 30 sekund. Pokud Auth nebo Venue service v tu chvíli hlásí chybu připojení k databázi, počkejte a požadavek zopakujte, služby se připojují až při prvním dotazu.

Užitečné příkazy:

```bash
docker compose up -d --build
```

```bash
docker compose logs -f auth
```

```bash
docker compose down
```

Smazání databáze včetně dat (při dalším startu se znovu spustí `init.sql`):

```bash
docker compose down -v
```

Po úpravě kódu služby je nutné image znovu sestavit (`docker compose up --build`), kód se do kontejnerů nemountuje.

### Varianta B – bez Dockeru (vývojový režim)

**1. Databáze.** Nejjednodušší je spustit jen MySQL z Docker Compose:

```bash
docker compose up -d mysql
```

Pokud máte vlastní MySQL 8.0, vytvořte databázi `rezervace_sportovist` a uživatele s právy k ní a nahrajte schéma ručně. Pozor: `services/auth/db/init.sql` na začátku **maže** tabulky `users` a `user_auth_providers`.

```bash
mysql -u rezervace_app -p rezervace_sportovist < services/auth/db/init.sql
```

```bash
mysql -u rezervace_app -p rezervace_sportovist < services/venue/db/init.sql
```

Případně můžete použít sdílenou týmovou databázi, přístupové údaje vám dá správce týmu.

**2. Instalace závislostí.** V každé složce služby spusťte `npm install`:

```bash
cd gateway && npm install && cd ..
```

```bash
for s in auth venue booking review audit; do (cd services/$s && npm install); done
```

**3. Spuštění.** Každou službu spusťte v **samostatném terminálu** z její složky. Příkaz `npm start` automaticky načte soubor `.env` ze stejné složky.

```bash
cd services/auth && npm start
```

```bash
cd services/venue && npm start
```

```bash
cd services/booking && npm start
```

```bash
cd services/review && npm start
```

```bash
cd services/audit && npm start
```

```bash
cd gateway && npm start
```

Každá služba po startu vypíše například `auth bezi, port: 4001`. Pro práci na konkrétní funkci stačí spustit jen gateway a služby, které potřebujete (např. pro správu areálů gateway, auth a venue).

---

## 6. Spuštění frontendu

```bash
cd frontend
```

```bash
npm install
```

```bash
npm run dev
```

Aplikace poběží na <http://localhost:5173>. Adresu gateway bere z `frontend/.env` (`VITE_API_URL`). Po změně `.env` je nutné dev server restartovat.

Produkční build (výstup do `frontend/dist/`) a jeho náhled:

```bash
npm run build
```

```bash
npm run preview
```

---

## 7. Ověření, že vše funguje

### 7.1 Kontrola stavu služeb

Každá služba má endpoint `/health`:

```bash
for p in 4000 4001 4002 4003 4004 4005; do curl -s http://localhost:$p/health; echo; done
```

Očekávaný výstup je u každé služby `{"status":"ok","service":"..."}`.

### 7.2 Registrace testovacího provozovatele

Požadavek jde přes gateway:

```bash
curl -s -X POST http://localhost:4000/auth/user/register -H "Content-Type: application/json" -d '{"firstName":"Karel","surName":"Novák","email":"karel@example.com","password":"heslo1234","role":"operator","termsAccepted":true}'
```

Odpověď obsahuje `token` a údaje o uživateli. Při dalším přihlášení stačí:

```bash
curl -s -X POST http://localhost:4000/auth/user/signIn -H "Content-Type: application/json" -d '{"email":"karel@example.com","password":"heslo1234"}'
```

### 7.3 Přihlášení ve frontendu

Frontend zatím nemá přihlašovací obrazovku a token čte z `localStorage` pod klíčem `playspot-token`. Otevřete <http://localhost:5173>, v prohlížeči otevřete vývojářskou konzoli (F12) a vložte token z předchozího kroku:

```js
localStorage.setItem('playspot-token', 'SEM_VLOZTE_TOKEN');
```

Po obnovení stránky se načte seznam areálů přihlášeného provozovatele a můžete založit nový areál. Bez tokenu stránka hlásí chybu „Pro tuto akci se musíte přihlásit.“

### 7.4 Ověření API bez frontendu

```bash
curl -s http://localhost:4000/venue/venue/list -H "Authorization: Bearer SEM_VLOZTE_TOKEN"
```

---

## 8. Časté problémy

| Příznak | Příčina a řešení |
|---|---|
| `401 user/unauthenticated` i s tokenem, v logu gateway `GATEWAY AUTH ERROR` | Veřejný klíč v `gateway/.env` nepatří k soukromému klíči v `services/auth/.env`, nebo token vypršel. Vygenerujte pár znovu (kapitola 4.2) a přihlaste se znovu. |
| `403 user/forbidden` s `params.command` | Volaný příkaz není v `gateway/src/permissions.js`, nebo na něj vaše role nemá právo (např. správa areálů je jen pro roli `operator`). |
| `403 user/roleNotSet` | Uživatel (typicky z OAuth) ještě nemá roli. Nastavte ji přes `POST /auth/user/setRole`. |
| `502 gateway/serviceUnavailable` | Cílová služba neběží nebo gateway má špatnou adresu v `*_URL`. Zkontrolujte `/health` dané služby. |
| `500 ... failed` z Auth nebo Venue, v logu `ECONNREFUSED` nebo `ER_ACCESS_DENIED_ERROR` | Špatné `DB_*` hodnoty nebo neběžící MySQL (kapitola 4.4). |
| V databázi chybí tabulky | `init.sql` se spouští jen při prvním startu s prázdným volume. Spusťte `docker compose down -v` a znovu `docker compose up --build`. |
| `env file ... not found` při `docker compose up` | Chybí některý z `.env` souborů z kapitoly 4.1. |
| `bad option: --env-file-if-exists` | Starší Node.js. Nainstalujte Node.js 24. |
| Chyba CORS v konzoli prohlížeče | `FRONTEND_URL` v `gateway/.env` neodpovídá adrese, na které běží frontend. |
| `Port ... already in use` / `EADDRINUSE` | Port obsazuje jiný proces (např. lokální MySQL na 3306 nebo služba spuštěná i v Dockeru i přes `npm start`). Ukončete ho nebo změňte `PORT`. |
| `429 tooManyAttempts` při přihlášení | Ochrana proti hádání hesla (5 neúspěšných pokusů na e-mail za 15 minut). Počkejte nebo restartujte Auth service. |

### Obnova hesla

Lokálně se neposílají žádné e-maily. Po zavolání `POST /auth/user/requestPasswordReset` vypíše Auth service odkaz pro obnovu hesla do svého logu (v Dockeru `docker compose logs auth`).
