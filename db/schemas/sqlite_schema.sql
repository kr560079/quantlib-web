-- Pricing history for all option calculations
CREATE TABLE IF NOT EXISTS pricing_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at  TEXT    NOT NULL,
    request     TEXT    NOT NULL,   -- JSON blob of the full request
    price       REAL,
    delta       REAL,
    gamma       REAL,
    vega        REAL,
    theta       REAL,
    rho         REAL,
    engine      TEXT,
    option_type TEXT,
    call_put    TEXT
);

-- Named scenarios a user saves for re-running
CREATE TABLE IF NOT EXISTS saved_scenarios (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    description TEXT,
    created_at  TEXT    NOT NULL,
    request     TEXT    NOT NULL    -- JSON blob
);

-- User-defined market data overrides
CREATE TABLE IF NOT EXISTS market_data (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    instrument  TEXT    NOT NULL,
    data_type   TEXT    NOT NULL,   -- 'spot', 'vol', 'rate', 'dividend'
    value       REAL    NOT NULL,
    as_of_date  TEXT    NOT NULL,
    created_at  TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pricing_history_created ON pricing_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_data_instrument ON market_data(instrument, data_type, as_of_date);
