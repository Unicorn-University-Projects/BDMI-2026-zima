# Rezervační systém sportovišť (Backend)

Backendová část aplikace pro rezervaci sportovišť postavená na mikroservisní architektuře. Systém zajišťuje správu areálů, rezervaci časových slotů, ověřování uživatelů, hodnocení a auditní logování.

---

## Přehled architektury

* **Architektura:** Mikroservisy v monorepu za společnou API Gateway.
* **Komunikace:** 
  * Klient -> API Gateway (REST, autorizace přes Bearer JWT).
  * API Gateway -> Mikroservisy (REST, předávání kontextu uživatele).
  * Mezi službami (REST, interní volání s rolí `System` přes sdílený klíč).
* **Databáze:** Relační MySQL (pro MVP společná instance, ale striktně oddělená schémata pro každou službu).

### Služby v systému
1. **API Gateway:** Jediný vstupní bod, routování požadavků, validace JWT.
2. **Auth service:** OAuth 2.0 (Google, Microsoft), správa uživatelů a rolí (`Athlete`, `Operator`), generování JWT.
3. **Venue service:** Areály, jednotlivá sportoviště, ceníky a provozní doba.
4. **Booking service:** Kalendářní sloty, tvorba a správa stavů rezervací.
5. **Review service:** Zpětná vazba a hodnocení po proběhlé rezervaci.
6. **Audit service:** Interní logování bezpečnostních a systémových událostí.

---

## Technologický stack

* **Runtime:** Node.js 24 LTS
* **Framework:** Express.js
* **Databáze:** MySQL 8.0 (ovladač `mysql2`)
* **Kontejnerizace:** Docker & Docker Compose

---

## Plánovaná struktura monorepa

Jednotlivé části backendu budou umístěny do vyhrazených složek v tomto repozitáři:

```text
├── gateway/              # API Gateway
├── services/
│   ├── auth/             # Autentizace a správa identit
│   ├── venue/            # Areály a sportoviště
│   ├── booking/          # Rezervace a sloty
│   ├── review/           # Uživatelské recenze
│   └── audit/            # Auditní log
├── docker-compose.yml    # Lokální orchestrace
└── README.md
