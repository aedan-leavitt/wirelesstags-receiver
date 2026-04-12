import https from 'https';

import { writeTemperaturePoint } from './app.mjs';

const estimatorEnabled = process.env.ESTIMATED_TEMPERATURE_ENABLED !== 'false';
const weatherApiHost = process.env.WEATHER_API_HOST || 'api.open-meteo.com';
const weatherLatitude = process.env.WEATHER_LATITUDE || '41.409105';
const weatherLongitude = process.env.WEATHER_LONGITUDE || '-112.036056';
const weatherTimezone = process.env.WEATHER_TIMEZONE || 'UTC';
const weatherTemperatureUnit = process.env.WEATHER_TEMPERATURE_UNIT || 'fahrenheit';
const estimatedSensorName = process.env.ESTIMATED_TEMPERATURE_SENSOR_NAME || 'Willard, UT';
const pollIntervalMs = Number(process.env.ESTIMATED_TEMPERATURE_POLL_INTERVAL_MS || 900000);

function buildForecastPath() {
    const params = new URLSearchParams({
        latitude: weatherLatitude,
        longitude: weatherLongitude,
        current: 'temperature_2m',
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
    return Date.parse(`${utcString} UTC`) / 1000;
}

async function recordEstimatedTemperature() {
    const response = await fetchJson(weatherApiHost, buildForecastPath());
    const current = response.current;

    if (!current || typeof current.temperature_2m !== 'number' || !current.time) {
        throw new Error('Weather API response is missing current temperature data');
    }

    await writeTemperaturePoint({
        sensor: estimatedSensorName,
        value: current.temperature_2m,
        timestamp: toUnixSeconds(current.time),
        source: 'estimated',
    });

    console.log(`Recorded estimated temperature ${current.temperature_2m} for ${estimatedSensorName} at ${current.time}`);
}

export function startEstimatedTemperaturePolling() {
    if (!estimatorEnabled) {
        console.log('Estimated temperature polling disabled');
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
