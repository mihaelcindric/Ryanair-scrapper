const express = require('express');
const router = express.Router();
const { getAirportCodes, getLocations, addFlight, getFilteredFlights, getAirportsForLocation, getConnectedAirports, getStoredFlights } = require('../controllers/flights.controller');


router.get('/airports', getAirportCodes);


router.get('/locations', getLocations);


router.post('/add-flight', addFlight);


router.get('/flights', getFilteredFlights);


router.get('/airports-for-location', getAirportsForLocation);


router.get("/connected-airports/:airportCode", getConnectedAirports);


router.post('/stored-flights', getStoredFlights);


module.exports = router;
