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
