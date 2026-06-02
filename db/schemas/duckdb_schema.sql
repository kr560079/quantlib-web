-- DuckDB schema: analytical / bulk pricing results

-- Bulk scenario grid results (spot × vol matrices)
CREATE TABLE IF NOT EXISTS scenario_grid (
    run_id      VARCHAR NOT NULL,
    created_at  TIMESTAMP NOT NULL,
    option_type VARCHAR,
    call_put    VARCHAR,
    engine      VARCHAR,
    strike      DOUBLE,
    spot        DOUBLE,
    volatility  DOUBLE,
    maturity    DATE,
    price       DOUBLE,
    delta       DOUBLE,
    gamma       DOUBLE,
    vega        DOUBLE,
    theta       DOUBLE
);

-- Time-series of prices for a named instrument
CREATE TABLE IF NOT EXISTS price_series (
    instrument  VARCHAR NOT NULL,
    as_of_date  DATE    NOT NULL,
    price       DOUBLE,
    delta       DOUBLE,
    vega        DOUBLE,
    PRIMARY KEY (instrument, as_of_date)
);

-- Vol surface snapshots
CREATE TABLE IF NOT EXISTS vol_surface (
    snapshot_id VARCHAR  NOT NULL,
    created_at  TIMESTAMP NOT NULL,
    underlying  VARCHAR,
    strike      DOUBLE,
    expiry      DATE,
    implied_vol DOUBLE
);
