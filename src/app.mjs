import express from 'express';
import bodyParser from 'body-parser';
import PrettyError from 'pretty-error';
import Influx from 'influx';

const influxDbHost = process.env.INFLUXDB_HOST;
const influxDbDb = process.env.INFLUXDB_DB;
const influxDbUser = process.env.INFLUXDB_USER;
const influxDbPass = process.env.INFLUXDB_PASS;

const influx = new Influx.InfluxDB({
    host: influxDbHost,
    database: influxDbDb,
    username: influxDbUser,
    password: influxDbPass,
    schema: [
        {
            measurement: 'humidity',
            fields: {
                value: Influx.FieldType.FLOAT,
            },
            tags: [
                'sensor'
            ]
        },
        {
            measurement: 'temperature',
            fields: {
                value: Influx.FieldType.FLOAT,
            },
            tags: [
                'sensor',
                'source'
            ]
        },
	{
	    measurement: 'brightness',
	    fields: {
		value: Influx.FieldType.FLOAT,
	    },
	    tags: [
		'sensor'
	    ]
	},
        {
            measurement: 'battery_voltage',
            fields: {
                value: Influx.FieldType.FLOAT,
            },
            tags: [
                'sensor'
            ]
        }
    ]
});

const app = express();

function toUnixSeconds(utcString) {
    return Date.parse(`${utcString} UTC`) / 1000;
}

export function writeTemperaturePoint({ sensor, value, timestamp, source }) {
    return influx.writePoints([
        {
            measurement: 'temperature',
            tags: { sensor, source },
            fields: { value },
            timestamp,
        }
    ], { precision: 's' });
}

console.log(`Starting up with InfluxDB host: ${influxDbHost}`);
app.set('trust proxy', 'loopback');

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.post('/measurement', (req, res) => {
    const measurement = req.body;
    const timestamp = toUnixSeconds(measurement.time);

    influx.writePoints([
        {
            measurement: 'humidity',
            tags: {sensor: measurement.name},
            fields: {value: measurement.hm},
            timestamp,
        },
        {
            measurement: 'temperature',
            tags: {sensor: measurement.name, source: 'reported'},
            fields: {value: measurement.temp},
            timestamp,
        },
	{
	    measurement: 'brightness',
	    tags: {sensor: measurement.name},
	    fields: {value: measurement.lux},
	    timestamp,
	},
        {
            measurement: 'battery_voltage',
            tags: {sensor: measurement.name},
            fields: {value: measurement.bat},
            timestamp,
        }
    ], {precision: 's'}).then(() => {
        res.status(200).end();
    }).catch(error => {
        console.error(error);
        res.status(500).end();
    })
});

const pe = new PrettyError();
pe.skipNodeFiles();
pe.skipPackage('express');

app.use((err, req, res, next) => {
    process.stderr.write(pe.render(err));
    next();
});

export default app;
