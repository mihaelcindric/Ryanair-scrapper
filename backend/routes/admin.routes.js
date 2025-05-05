const express = require('express');
const router = express.Router();
const {
  getTableSchema,
  getAllRecords,
  insertRecord,
  deleteRecord,
  insertAirportAirport,
  getLocationByName,
  updateRecord,
  getAirportByCode,
  airportRelationExists
} = require('../controllers/admin.controller');

router.post('/table-schema', getTableSchema);
router.post('/table-data', getAllRecords);
router.post('/insert-record', insertRecord);
router.post('/delete-record', deleteRecord);
router.post('/airport-relationships', insertAirportAirport);
router.get('/location/by-name', getLocationByName);
router.put('/update-record', updateRecord);
router.post('/get-airport-by-code', getAirportByCode);
router.post('/airport-relation-exists', airportRelationExists);

module.exports = router;
