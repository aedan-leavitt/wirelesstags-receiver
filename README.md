# Wireless Tags Receiver

## Introduction

Welcome to the Wireless Tags Receiver project! This application, built using Node.js, offers an efficient solution for managing and processing data from wireless tags. It's tailored for those who require a reliable and straightforward way to handle data from various wireless sensors, making it an excellent choice for both personal and industrial applications.

## Project Overview

The Wireless Tags Receiver is designed to seamlessly receive, interpret, and act upon the data transmitted by wireless tags. Whether you are tracking environmental parameters, overseeing asset movement, or integrating with IoT systems, this application stands as a versatile and dependable tool in your data management arsenal.

## Getting Started

### Prerequisites

Before diving into the Wireless Tags Receiver, ensure you have Node.js installed on your machine. This is essential for running the application and managing its dependencies.

### Installation Guide

1.  **Cloning the Repository**: Begin by cloning the repository to your local machine. Use the following Git command, substituting `yourusername` with your actual GitHub username.
    
    
    `git clone https://github.com/yourusername/wirelesstags-receiver.git`
    
    `cd wirelesstags-receiver` 
    
2.  **Installing Dependencies**: With the repository cloned, install the necessary Node.js dependencies by running:
    
    `npm install` 
    
3.  **Environment Setup**: Before starting the application, ensure to set up the necessary environment variables. These variables are crucial for the proper functioning of the application, handling everything from configuration settings to API keys.
    

### Running the Application

Once the dependencies are installed and environment variables are set, start the application by executing:

`npm start` 

### Estimated Temperature Tracking

The server also records an estimated outdoor temperature for Willard, Utah so you can compare local sensor readings against a consistent reference. Sensor submissions are stored in InfluxDB with `source=reported`; weather-model values are stored in the same `temperature` measurement with `source=estimated`.

Default estimator settings:

- `WEATHER_LATITUDE`
- `WEATHER_LONGITUDE`
- `ESTIMATED_TEMPERATURE_SENSOR_NAME`
- `ESTIMATED_TEMPERATURE_POLL_INTERVAL_MS=900000`
- `WEATHER_TEMPERATURE_UNIT=fahrenheit`
- `WEATHER_TIMEZONE=UTC`

Set `ESTIMATED_TEMPERATURE_ENABLED=false` to disable the polling job.

## Features and Usage

The application initializes a server that actively listens for data from wireless tags. You can adapt and customize the application to your specific needs by modifying the source code, particularly focusing on the `app.mjs` file.
