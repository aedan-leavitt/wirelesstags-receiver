import https from 'https';

import { writeTemperaturePoint } from './app.mjs';

const estimatorEnabled = process.env.ESTIMATED_TEMPERATURE_ENABLED !== 'false';
const weatherApiHost = process.env.WEATHER_API_HOST || 'api.open-meteo.com';
const weatherLatitude = process.env.WEATHER_LATITUDE;
const weatherLongitude = process.env.WEATHER_LONGITUDE;
const weatherTimezone = process.env.WEATHER_TIMEZONE || 'UTC';
const weatherTemperatureUnit = process.env.WEATHER_TEMPERATURE_UNIT || 'fahrenheit';
const estimatedSensorName = process.env.ESTIMATED_TEMPERATURE_SENSOR_NAME || 'estimated_outside';
const pollIntervalMs = Number(process.env.ESTIMATED_TEMPERATURE_POLL_INTERVAL_MS || 900000);

function buildForecastPath() {
    const params = new URLSearchParams({
        latitude: weatherLatitude,
        longitude: weatherLongitude,
        current: 'temperature_2m',
        daily: 'temperature_2m_max,temperature_2m_min',
        forecast_days: '1',
        timezone: weatherTimezone,
        temperature_unit: weatherTemperatureUnit,
    });

    return `/v1/forecast?${params.toString()}`;
}

function fetchJson(host, path) {
    return new Promise((resolve, reject) => {
        const req = https.request({
            host,
            path,
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'User-Agent': 'wirelesstags-receiver',
            },
        }, res => {
            let body = '';

            res.on('data', chunk => {
                body += chunk;
            });

            res.on('end', () => {
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    reject(new Error(`Weather API request failed with status ${res.statusCode}: ${body}`));
                    return;
                }

                try {
                    resolve(JSON.parse(body));
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

function toUnixSeconds(utcString) {
    const candidates = [];

    if (/^\d{4}-\d{2}-\d{2}T/.test(utcString) && !/[zZ]|[+-]\d{2}:\d{2}$/.test(utcString)) {
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(utcString)) {
            candidates.push(`${utcString}:00Z`);
        }
        candidates.push(`${utcString}Z`);
    } else if (/^\d{4}-\d{2}-\d{2} /.test(utcString) && !/[zZ]|[+-]\d{2}:\d{2}$/.test(utcString)) {
        candidates.push(`${utcString} UTC`);
    }

    candidates.push(utcString);

    for (const candidate of candidates) {
        const timestampMs = Date.parse(candidate);
        if (!Number.isNaN(timestampMs)) {
            return timestampMs / 1000;
        }
    }

    throw new Error(`Unable to parse timestamp: ${utcString}`);
}

async function recordEstimatedTemperature() {
    const response = await fetchJson(weatherApiHost, buildForecastPath());
    const current = response.current;
    const daily = response.daily;

    if (!current || typeof current.temperature_2m !== 'number' || !current.time) {
        throw new Error('Weather API response is missing current temperature data');
    }

    if (
        !daily
        || !Array.isArray(daily.temperature_2m_max)
        || !Array.isArray(daily.temperature_2m_min)
        || typeof daily.temperature_2m_max[0] !== 'number'
        || typeof daily.temperature_2m_min[0] !== 'number'
    ) {
        throw new Error('Weather API response is missing daily temperature forecast data');
    }

    const timestamp = toUnixSeconds(current.time);

    await Promise.all([
        writeTemperaturePoint({
            sensor: estimatedSensorName,
            value: current.temperature_2m,
            timestamp,
            source: 'estimated',
        }),
        writeTemperaturePoint({
            sensor: estimatedSensorName,
            value: daily.temperature_2m_max[0],
            timestamp,
            source: 'estimated_daily_max',
        }),
        writeTemperaturePoint({
            sensor: estimatedSensorName,
            value: daily.temperature_2m_min[0],
            timestamp,
            source: 'estimated_daily_min',
        }),
    ]);

    console.log(
        `Recorded estimated current/max/min ${current.temperature_2m}/${daily.temperature_2m_max[0]}/${daily.temperature_2m_min[0]} `
        + `for ${estimatedSensorName} at ${current.time}`
    );
}

export function startEstimatedTemperaturePolling() {
    if (!estimatorEnabled) {
        console.log('Estimated temperature polling disabled');
        return;
    }

    if (!weatherLatitude || !weatherLongitude) {
        console.error('Estimated temperature polling requires WEATHER_LATITUDE and WEATHER_LONGITUDE');
        return;
    }
    if (!Number.isFinite(pollIntervalMs) || pollIntervalMs <= 0) {
        console.error(`Invalid ESTIMATED_TEMPERATURE_POLL_INTERVAL_MS value: ${pollIntervalMs}`);
        return;
    }

    let requestInFlight = false;

    const poll = async () => {
        if (requestInFlight) {
            return;
        }

        requestInFlight = true;
        try {
            await recordEstimatedTemperature();
        } catch (error) {
            console.error('Failed to record estimated temperature', error);
        } finally {
            requestInFlight = false;
        }
    };

    poll();
    setInterval(poll, pollIntervalMs);
}
