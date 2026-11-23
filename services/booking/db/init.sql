-- Rezervace (vlastník: booking service). Schéma podle Application Modelu:
-- date "YYYY-MM-DD", startTime "HH:00" (slot trvá 1 hodinu), state created/confirmed/cancelled/completed.
-- Spouští se po services/venue/db/init.sql (cizí klíč na sports_grounds).

CREATE TABLE IF NOT EXISTS reservations (
  id CHAR(36) PRIMARY KEY,
  sportsGroundId CHAR(36) NOT NULL,
  athleteId CHAR(36) NOT NULL,
  `date` DATE NOT NULL,
  startTime CHAR(5) NOT NULL,
  price DECIMAL(8, 2) NOT NULL,
  state ENUM('created', 'confirmed', 'cancelled', 'completed') NOT NULL DEFAULT 'created',
  note VARCHAR(200) NULL,
  rejectionReason VARCHAR(200) NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  -- 1 pro rezervaci, která drží slot (created, confirmed), jinak NULL.
  -- Unikátní index pak dovolí na jednom slotu nejvýš jednu nezrušenou rezervaci.
  activeSlot TINYINT GENERATED ALWAYS AS (IF(state IN ('created', 'confirmed'), 1, NULL)) STORED,
  UNIQUE KEY uq_reservations_active_slot (sportsGroundId, `date`, startTime, activeSlot),
  INDEX idx_reservations_athlete_date (athleteId, `date`),
  INDEX idx_reservations_date_state (`date`, state),
  CONSTRAINT chk_reservations_start_time CHECK (startTime REGEXP '^([01][0-9]|2[0-3]):00$'),
  CONSTRAINT chk_reservations_price CHECK (price > 0),
  CONSTRAINT fk_reservations_sports_ground
    FOREIGN KEY (sportsGroundId) REFERENCES sports_grounds (id) ON DELETE RESTRICT
);
