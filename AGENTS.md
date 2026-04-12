# Repository Guidelines

## Project Structure & Module Organization

Application code lives in `src/`.

- `src/server.mjs`: process entrypoint; starts the Express server and the weather estimator polling loop.
- `src/app.mjs`: Express app, `/measurement` ingestion route, InfluxDB schema, and shared `writeTemperaturePoint(...)`.
- `src/weather-estimator.mjs`: Open-Meteo polling, timestamp parsing, and writes for estimated current / daily max / daily min temperatures.

Operational files at the repo root:

- `Dockerfile`
- `docker-compose.yml`
- `package.json`
- `AGENTS.md`

This repo does not have an automated test suite configured yet.

## Build, Run, and Verification Commands

- `npm install`: install runtime dependencies.
- `npm start`: start the server with `node src/server.mjs --presets env`.
- `node --check src/app.mjs && node --check src/server.mjs && node --check src/weather-estimator.mjs`: quick syntax validation.
- `sudo systemctl restart wirelesstags`: restart the deployed local service on this machine.
- `sudo journalctl -u wirelesstags -n 50 --no-pager`: inspect recent receiver logs.
- `influx -host localhost -port 8086 -database wirelesstags -execute "<QUERY>"`: inspect live InfluxDB state.

Expected runtime environment:

- `INFLUXDB_HOST`
- `INFLUXDB_DB`
- `INFLUXDB_USER`
- `INFLUXDB_PASS`

Optional estimator environment:

- `ESTIMATED_TEMPERATURE_ENABLED`
- `ESTIMATED_TEMPERATURE_SENSOR_NAME`
- `ESTIMATED_TEMPERATURE_POLL_INTERVAL_MS`
- `WEATHER_API_HOST`
- `WEATHER_LATITUDE`
- `WEATHER_LONGITUDE`
- `WEATHER_TIMEZONE`
- `WEATHER_TEMPERATURE_UNIT`

Defaults currently matter:

- `PORT=8900`
- `HOSTNAME=0.0.0.0`
- `ESTIMATED_TEMPERATURE_SENSOR_NAME=estimated_outside`
- `ESTIMATED_TEMPERATURE_POLL_INTERVAL_MS=900000`
- `WEATHER_TIMEZONE=UTC`

The repo intentionally does not include default forecast coordinates. Set `WEATHER_LATITUDE` and `WEATHER_LONGITUDE` in deployment-specific environment configuration.

## Data Model & InfluxDB Notes

Measurements written by the receiver:

- `humidity`
- `temperature`
- `brightness`
- `battery_voltage`

Important `temperature` tag behavior:

- Reported tag sensor payloads are written with `source='reported'`.
- Estimated current forecast is written with `source='estimated'`.
- Estimated forecast daily max is written with `source='estimated_daily_max'`.
- Estimated forecast daily min is written with `source='estimated_daily_min'`.

The `temperature` measurement schema uses:

- tags: `sensor`, `source`
- field: `value`

Notes for debugging:

- Timestamp handling is sensitive. Timezone-less ISO timestamps are intentionally parsed as UTC first.
- InfluxDB retention is currently infinite (`autogen`, duration `0s`), so old data is not deleted automatically.
- Estimated max/min are written every poll, not once per day.

## Weather Estimator Behavior

The estimator polls Open-Meteo on an interval and writes three temperature points per poll for the configured estimated sensor:

- current temperature
- daily forecast max
- daily forecast min

These are written with the same poll timestamp. The daily max/min are not computed from prior Influx points; they come directly from the `daily.temperature_2m_max[0]` and `daily.temperature_2m_min[0]` values returned by Open-Meteo.

When changing estimator logic:

- keep the three `source` values stable unless you also update Grafana queries
- verify timestamps land inside Grafana's `now-24h` / `now-6h` windows
- verify with both InfluxQL and Grafana datasource API queries when panel behavior looks wrong

## Grafana Dashboard Notes

This repo also has a live local Grafana instance backing the `Outside` dashboard.

Current live dashboard assumptions:

- Dashboard title: `Outside`
- Dashboard UID: `d660f7de-835a-48a0-bb56-37427fa90992`
- Versioned dashboard export in repo: `grafana/Outside.dashboard.json`

Current `Outside` layout intent:

- Three large reported panels stacked vertically:
  - `Today's High`
  - `Current`
  - `Today's Low`
- One full-width estimated panel at the bottom:
  - `High`
  - `Current`
  - `Low`

Current query semantics:

- Reported high: `max(value)` for `sensor='07_outside'`
- Reported current: `last(value)` for `sensor='07_outside'`
- Reported low: `min(value)` for `sensor='07_outside'`
- Estimated high: `last(value)` for `sensor='estimated_outside' AND source='estimated_daily_max'`
- Estimated current: `last(value)` for `sensor='estimated_outside' AND source='estimated'`
- Estimated low: `last(value)` for `sensor='estimated_outside' AND source='estimated_daily_min'`

Color expectations in Grafana:

- high: red
- current: white
- low: blue

When changing Grafana:

- prefer updating the live dashboard carefully instead of rebuilding from scratch
- keep portrait-tablet readability in mind
- preserve color semantics for high/current/low
- back up the dashboard JSON before structural edits

## Coding Style & Change Guidelines

- Use ESM and keep imports grouped at the top.
- Prefer 4-space indentation in JS files.
- Use `camelCase` for variables and functions.
- Keep route logic in `app.mjs`, process bootstrap in `server.mjs`, and weather polling in `weather-estimator.mjs`.
- Avoid changing tag names or source values casually; they are part of the Grafana contract now.

## Testing & Manual Verification

There is no test framework configured. For nontrivial changes, manually verify:

- `node --check` on touched modules
- receiver service restarts cleanly
- `journalctl` shows expected estimated writes
- Influx queries return expected points
- Grafana datasource queries return expected frames when dashboard behavior is suspicious

Good manual checks:

- `SELECT * FROM "temperature" WHERE "sensor" = 'estimated_outside' ORDER BY time DESC LIMIT 10`
- `SELECT last("value") FROM "temperature" WHERE "sensor" = 'estimated_outside' AND "source" = 'estimated'`
- `SELECT last("value") FROM "temperature" WHERE "sensor" = 'estimated_outside' AND "source" = 'estimated_daily_max'`
- `SELECT last("value") FROM "temperature" WHERE "sensor" = 'estimated_outside' AND "source" = 'estimated_daily_min'`

## Security & Operations

- Never commit real InfluxDB or Grafana credentials.
- Avoid logging full incoming payloads unless actively debugging.
- Be aware that database growth is currently unbounded because retention is infinite.
