const express = require('express');
const router = express.Router();
const {
  getAirportCodes,
  getLocations,
  addFlight,
  getFilteredFlights,
  getAirportsForLocation,
  getConnectedAirports,
  getStoredFlights,
  getLocationDetails,
  getLocationByAirport,
  addTravel,
  addTravelFlight,
  getStoredTravels,
  getTravelFlights,
  getSavedTravels,
  saveTravel,
  removeSavedTravel,
  getSavedTravel,
  getBaggageByUser,
  addBaggage,
  updateBaggage,
  deleteBaggage,
  getFlightCategories,
  getAirplaneById
} = require('../controllers/flights.controller');


router.get('/airports', getAirportCodes);
router.get('/locations', getLocations);
router.post('/add-flight', addFlight);
router.get('/flights', getFilteredFlights);
router.get('/airports-for-location', getAirportsForLocation);
router.get("/connected-airports/:airportCode", getConnectedAirports);
router.post('/stored-flights', getStoredFlights);
router.get('/locations/details', getLocationDetails);
router.get('/airports/location', getLocationByAirport);
router.post('/travels/add-travel', addTravel);
router.post('/travels/add-travel-flight', addTravelFlight);
router.post('/travels/stored-travels', getStoredTravels);
router.get('/travels/:travelId/flights', getTravelFlights);
router.post('/travels/saved-travels', getSavedTravels);
router.post('/travels/save-travel', saveTravel);
router.post('/travels/remove-saved-travel', removeSavedTravel);
router.post('/travels/saved-travel', getSavedTravel);
router.post("/baggage/by-user", getBaggageByUser);
router.post("/baggage/add", addBaggage);
router.post("/baggage/update", updateBaggage);
router.post("/baggage/delete", deleteBaggage);
router.post('/flights/categories', getFlightCategories);
router.post('/getAirplaneById', getAirplaneById);


module.exports = router;
