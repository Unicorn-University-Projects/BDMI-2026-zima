-- Sync shared/local venue schema to match services/venue/db/init.sql
--
-- Run (example):
--   mysql -h HOST -P 3306 -u USER -p rezervace_sportovist < db/migrations/001_sync_venue_schema.sql
-- Idempotent: safe to re-run; existing columns/indexes are skipped.

SET @db := DATABASE();

-- venues.streetNumber
SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'venues' AND COLUMN_NAME = 'streetNumber'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE venues ADD COLUMN streetNumber VARCHAR(20) NOT NULL DEFAULT '''' AFTER street',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Split legacy "street houseNo" into street + streetNumber when streetNumber is empty
UPDATE venues
SET
  streetNumber = SUBSTRING_INDEX(street, ' ', -1),
  street = TRIM(SUBSTRING(street, 1, CHAR_LENGTH(street) - CHAR_LENGTH(SUBSTRING_INDEX(street, ' ', -1)) - 1))
WHERE (streetNumber IS NULL OR streetNumber = '')
  AND street LIKE '% %'
  AND SUBSTRING_INDEX(street, ' ', -1) REGEXP '[0-9]';

ALTER TABLE venues
  MODIFY COLUMN name VARCHAR(100) NOT NULL,
  MODIFY COLUMN street VARCHAR(100) NOT NULL,
  MODIFY COLUMN streetNumber VARCHAR(20) NOT NULL,
  MODIFY COLUMN noteForAthletes VARCHAR(500) NULL;

-- Refresh uniqueness index to include streetNumber
SET @exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'venues' AND INDEX_NAME = 'idx_venues_operator_name_address'
);
SET @sql := IF(@exists > 0, 'ALTER TABLE venues DROP INDEX idx_venues_operator_name_address', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'venues' AND INDEX_NAME = 'idx_venues_operator_name_address'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE venues ADD INDEX idx_venues_operator_name_address (operatorId, name, street, streetNumber, city)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- price_lists peak columns
SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'price_lists' AND COLUMN_NAME = 'hasPeak'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE price_lists ADD COLUMN hasPeak BOOLEAN NOT NULL DEFAULT FALSE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'price_lists' AND COLUMN_NAME = 'peakDays'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE price_lists ADD COLUMN peakDays VARCHAR(50) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'price_lists' AND COLUMN_NAME = 'peakFrom'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE price_lists ADD COLUMN peakFrom VARCHAR(5) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'price_lists' AND COLUMN_NAME = 'peakTo'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE price_lists ADD COLUMN peakTo VARCHAR(5) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- opening_hours times as VARCHAR(5) so "24:00" is valid
ALTER TABLE opening_hours
  MODIFY COLUMN openFrom VARCHAR(5) NULL,
  MODIFY COLUMN openTo VARCHAR(5) NULL;

-- Unique sports ground name per venue
SET @exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sports_grounds' AND INDEX_NAME = 'uq_sports_grounds_venue_name'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE sports_grounds ADD UNIQUE KEY uq_sports_grounds_venue_name (venueId, name)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
