# Repository Guidelines

## Project Structure & Module Organization

Application code lives in `src/`. `src/server.mjs` is the process entrypoint and starts the Express server. `src/app.mjs` wires middleware, defines the `/measurement` route, and writes sensor data to InfluxDB. Container files are at the repo root: `Dockerfile` and `docker-compose.yml`. There is no `test/` directory yet; add tests under `test/` or alongside modules as `*.test.mjs` if you introduce a test runner.

## Build, Test, and Development Commands

- `npm install`: installs runtime dependencies.
- `npm start`: starts the server with `node src/server.mjs --presets env`.
- `docker compose up --build`: builds and runs the service in containers.

Set these environment variables before running locally: `INFLUXDB_HOST`, `INFLUXDB_DB`, `INFLUXDB_USER`, `INFLUXDB_PASS`. `PORT` defaults to `8900`; `HOSTNAME` defaults to `0.0.0.0`.

## Coding Style & Naming Conventions

This project uses ESM (`.mjs`) and straightforward Express route handlers. Prefer 4-space indentation and keep imports grouped at the top of each file. Use `camelCase` for variables and functions, and keep measurement names and payload keys aligned with the existing API (`humidity`, `temperature`, `brightness`, `battery_voltage`; request fields like `name`, `hm`, `temp`, `lux`, `bat`). Keep modules focused: routing and ingestion logic in `app.mjs`, bootstrap logic in `server.mjs`.

## Testing Guidelines

There is no test framework configured yet. For any nontrivial change, add automated coverage for request handling and InfluxDB writes, ideally by mocking `influx.writePoints`. Name tests after behavior, for example `measurement-route.test.mjs`. At minimum, manually verify `POST /measurement` with a representative payload before opening a PR.

## Commit & Pull Request Guidelines

Recent history uses short, imperative commit messages such as `Create README.md` and `Refactored app.mjs...`. Follow that pattern: start with a verb and describe the behavior change clearly. Pull requests should include:

- A short summary of the change
- Any new environment variables or deployment impact
- Manual verification steps or test results
- Sample payloads or logs if the request/response behavior changed

## Security & Configuration Tips

Never commit real InfluxDB credentials. Use environment variables or Docker secrets, and avoid logging full incoming payloads unless you have a clear debugging need.
