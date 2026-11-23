-- =====================================================================
-- Migrace tabulky reservations ve SDÍLENÉ databázi na schéma podle
-- Application Modelu (date "YYYY-MM-DD", startTime "HH:00", state).
--
-- Původní schéma (skript 01_struktura.sql z 9. 11.): slotStart DATETIME, status,
-- cancellationType, cancelledById, cancelledAt, confirmedAt, completedAt.
-- Data a id rezervací zůstávají (na id odkazuje ratings.reservationId).
--
-- Spuštěno 23. 11. 2026 účtem rezervace_admin. Lokální Docker databáze
-- tuto migraci nepotřebuje – má tabulku rovnou z services/booking/db/init.sql.
-- Příkazy ALTER se v MySQL nedají vrátit transakcí, proto je první krok záloha.
-- =====================================================================

-- 0) Záloha (po ověření ji lze smazat: DROP TABLE reservations_backup_20261123;)
CREATE TABLE reservations_backup_20261123 AS SELECT * FROM reservations;

-- 1) Nové sloupce
ALTER TABLE reservations
  ADD COLUMN `date` DATE NULL AFTER athleteId,
  ADD COLUMN startTime CHAR(5) NULL AFTER `date`,
  ADD COLUMN state ENUM('created', 'confirmed', 'cancelled', 'completed') NOT NULL DEFAULT 'created' AFTER price;

-- 2) Převod dat (slotStart je v místním čase, stejně jako date/startTime)
UPDATE reservations
SET `date` = DATE(slotStart),
    startTime = DATE_FORMAT(slotStart, '%H:%i'),
    state = status;

-- 3) Pomocné indexy pro cizí klíče, aby šly odstranit staré indexy
ALTER TABLE reservations
  ADD INDEX idx_reservations_sports_ground_date (sportsGroundId, `date`),
  ADD INDEX idx_reservations_athlete_date (athleteId, `date`);

-- 4) Odstranění starých omezení, indexů a sloupců
ALTER TABLE reservations
  DROP CHECK chk_res_whole_hour,
  DROP CHECK chk_res_cancellation,
  DROP CHECK chk_res_rejection,
  DROP CHECK chk_res_price,
  DROP FOREIGN KEY fk_reservations_cancelled_by;

ALTER TABLE reservations
  DROP INDEX uq_reservations_active_slot,
  DROP INDEX idx_reservations_athlete_slot,
  DROP INDEX idx_reservations_status_slot,
  DROP INDEX idx_reservations_cancelled_by;

ALTER TABLE reservations
  DROP COLUMN activeSlot,
  DROP COLUMN slotStart,
  DROP COLUMN status,
  DROP COLUMN cancellationType,
  DROP COLUMN cancelledById,
  DROP COLUMN cancelledAt,
  DROP COLUMN confirmedAt,
  DROP COLUMN completedAt;

-- 5) Nové schéma podle Application Modelu (shodné se services/booking/db/init.sql)
ALTER TABLE reservations
  MODIFY `date` DATE NOT NULL,
  MODIFY startTime CHAR(5) NOT NULL,
  MODIFY note VARCHAR(200) NULL,
  MODIFY rejectionReason VARCHAR(200) NULL,
  ADD COLUMN activeSlot TINYINT GENERATED ALWAYS AS (IF(state IN ('created', 'confirmed'), 1, NULL)) STORED,
  ADD UNIQUE KEY uq_reservations_active_slot (sportsGroundId, `date`, startTime, activeSlot),
  ADD INDEX idx_reservations_date_state (`date`, state),
  ADD CONSTRAINT chk_reservations_start_time CHECK (startTime REGEXP '^([01][0-9]|2[0-3]):00$'),
  ADD CONSTRAINT chk_reservations_price CHECK (price > 0);

ALTER TABLE reservations
  DROP INDEX idx_reservations_sports_ground_date;

-- 6) Kontrola: počty a obsah musí odpovídat záloze
SELECT COUNT(*) AS pocet,
       SUM(CONCAT(r.`date`, ' ', r.startTime, ':00') = b.slotStart AND r.state = b.status) AS shodnych
FROM reservations r
JOIN reservations_backup_20261123 b ON b.id = r.id;
