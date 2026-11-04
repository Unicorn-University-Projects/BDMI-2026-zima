DROP TABLE IF EXISTS user_auth_providers;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id                     CHAR(36)     NOT NULL,
  email                  VARCHAR(255) NOT NULL,
  firstName              VARCHAR(100) NOT NULL,
  surName                VARCHAR(100) NOT NULL,
  phoneNumber            VARCHAR(30)  NULL,
  role                   ENUM('athlete', 'operator') NULL,
  termsAcceptedAt        DATETIME     NOT NULL,
  passwordHash           VARCHAR(255) NULL,
  passwordChangedAt      DATETIME     NULL,
  passwordResetTokenHash CHAR(64)     NULL,
  passwordResetExpiresAt DATETIME     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_auth_providers (
  userId         CHAR(36)     NOT NULL,
  provider       ENUM('google', 'microsoft') NOT NULL,
  providerUserId VARCHAR(255) NOT NULL,
  email          VARCHAR(255) NULL,
  linkedAt       DATETIME     NOT NULL,
  PRIMARY KEY (provider, providerUserId),
  KEY idx_uap_user (userId),
  CONSTRAINT fk_uap_user FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;