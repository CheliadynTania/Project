CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ================================================
-- 1. USERS — користувачі системи
-- ================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);


-- ================================================
-- 2. SESSIONS — сесії авторизації
-- ================================================
CREATE TABLE IF NOT EXISTS sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);


-- ================================================
-- 3. CONTENT_BLOCKS — записи (текст і файли)
-- ================================================
CREATE TABLE IF NOT EXISTS content_blocks (
  id                SERIAL PRIMARY KEY,
  hash              VARCHAR(12) UNIQUE NOT NULL,

  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,

  content_type      VARCHAR(10) NOT NULL
                    CHECK (content_type IN ('text', 'file')),

  storage_key       TEXT NOT NULL,
  original_filename TEXT,
  mime_type         TEXT,
  text_preview      TEXT,

  password_hash     TEXT,
  max_views         INT CHECK (max_views > 0),
  view_count        INT NOT NULL DEFAULT 0,
  burn_after_read   BOOLEAN NOT NULL DEFAULT false,

  expires_at        TIMESTAMPTZ NOT NULL,
  status            VARCHAR(10) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'expired', 'deleted')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_blocks_hash
  ON content_blocks(hash);

CREATE INDEX IF NOT EXISTS idx_content_blocks_user_id
  ON content_blocks(user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_blocks_expires_at
  ON content_blocks(expires_at)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_content_blocks_status
  ON content_blocks(status);


-- ================================================
-- 4. ACCESS_LOGS — логи доступу до записів
-- ================================================
CREATE TABLE IF NOT EXISTS access_logs (
  id          SERIAL PRIMARY KEY,
  block_id    INT NOT NULL REFERENCES content_blocks(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address  INET,
  user_agent  TEXT,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_logs_block_id   ON access_logs(block_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_accessed_at ON access_logs(accessed_at);
