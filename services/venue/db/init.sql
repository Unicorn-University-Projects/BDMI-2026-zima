CREATE TABLE IF NOT EXISTS venues (
  id CHAR(36) PRIMARY KEY,
  operatorId CHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  street VARCHAR(150) NOT NULL,
  city VARCHAR(100) NOT NULL,
  noteForAthletes VARCHAR(1000) NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_venues_operatorId (operatorId),
  INDEX idx_venues_operator_name_address (operatorId, name, street, city)
);

CREATE TABLE IF NOT EXISTS sports (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS sports_grounds (
  id CHAR(36) PRIMARY KEY,
  venueId CHAR(36) NOT NULL,
  sportId CHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  surface VARCHAR(50) NULL,
  coverType ENUM('indoor', 'outdoor') NOT NULL,
  status ENUM('inactive', 'active') NOT NULL DEFAULT 'inactive',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sports_grounds_venueId (venueId),
  INDEX idx_sports_grounds_sportId (sportId),
  CONSTRAINT fk_sports_grounds_venue
    FOREIGN KEY (venueId) REFERENCES venues (id) ON DELETE RESTRICT,
  CONSTRAINT fk_sports_grounds_sport
    FOREIGN KEY (sportId) REFERENCES sports (id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS price_lists (
  sportsGroundId CHAR(36) PRIMARY KEY,
  regularPrice DECIMAL(8, 2) NOT NULL,
  peakPrice DECIMAL(8, 2) NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_price_lists_sports_ground
    FOREIGN KEY (sportsGroundId) REFERENCES sports_grounds (id) ON DELETE CASCADE
);

INSERT INTO sports (id, code, name) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'tennis', 'Tenis'),
  ('b0000000-0000-4000-8000-000000000002', 'badminton', 'Badminton'),
  ('b0000000-0000-4000-8000-000000000003', 'squash', 'Squash'),
  ('b0000000-0000-4000-8000-000000000004', 'volleyball', 'Volejbal'),
  ('b0000000-0000-4000-8000-000000000005', 'table_tennis', 'Stolní tenis')
ON DUPLICATE KEY UPDATE name = VALUES(name);
