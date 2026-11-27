-- Rezervace (vlastník: booking service). Spouští se po auth a venue init.sql
-- (cizí klíče na users a sports_grounds), viz pořadí v docker-compose.yml.

CREATE TABLE IF NOT EXISTS reservations (
  id CHAR(36) PRIMARY KEY,
  sportsGroundId CHAR(36) NOT NULL,
  -- Stejná collation jako users.id (auth/db/init.sql), jinak cizí klíč nejde vytvořit.
  athleteId CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Sportovec (users.role = athlete)',
  date DATE NOT NULL,
  startTime CHAR(5) NOT NULL,
  price DECIMAL(8, 2) NOT NULL COMMENT 'Cena slotu podle ceníku v okamžiku rezervace',
  state ENUM('created', 'confirmed', 'cancelled', 'completed') NOT NULL DEFAULT 'created',
  note VARCHAR(200) NULL,
  rejectionReason VARCHAR(200) NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  activeSlot TINYINT GENERATED ALWAYS AS (IF(state IN ('created', 'confirmed'), 1, NULL)) STORED,
  UNIQUE KEY uq_reservations_active_slot (sportsGroundId, date, startTime, activeSlot),
  KEY idx_reservations_athlete_date (athleteId, date),
  KEY idx_reservations_date_state (date, state),
  CONSTRAINT fk_reservations_athlete FOREIGN KEY (athleteId) REFERENCES users (id),
  CONSTRAINT fk_reservations_sports_ground FOREIGN KEY (sportsGroundId) REFERENCES sports_grounds (id),
  CONSTRAINT chk_reservations_price CHECK (price > 0),
  CONSTRAINT chk_reservations_start_time CHECK (REGEXP_LIKE(startTime, '^([01][0-9]|2[0-3]):00$'))
);
