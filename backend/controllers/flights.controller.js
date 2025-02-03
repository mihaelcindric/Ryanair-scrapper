const connectToDatabase = require('../db/db.config');


const getAirportCodes = async (req, res) => {
  try {
    const pool = await connectToDatabase();
    const result = await pool.request().query('SELECT code FROM Airport');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching airport codes:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getLocations = async (req, res) => {
  try {
    const pool = await connectToDatabase();
    const result = await pool.request().query('SELECT name, country FROM Location');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching locations:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const addFlight = async (req, res) => {
  const { from, to, departure_time, arrival_time, duration, price, sold_out, unavailable, flight_number, airplane_id } = req.body;
  console.log(`Inserting or updating flight: ${from} -> ${to} - departure_time: ${departure_time} - arrival_time: ${arrival_time}`);

  if (!from || !to || !departure_time || !arrival_time || !duration ||
    price === undefined || sold_out === undefined || unavailable === undefined) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    const pool = await connectToDatabase();
    const request = pool.request();

    request
      .input('flight_number', flight_number || null)
      .input('departure_time', departure_time)
      .input('arrival_time', arrival_time)
      .input('duration', duration)
      .input('aircompany', 'Ryanair')
      .input('price', price)
      .input('sold_out', sold_out)
      .input('unavailable', unavailable)
      .input('airplane_id', airplane_id || null)
      .input('from_code', from)
      .input('to_code', to);

    // call stored procedure
    const result = await request.execute('sp_AddOrUpdateFlight');

    if (result.recordset.length > 0) {
      const flightId = result.recordset[0].id;
      console.log(`✅ Flight upserted with ID: ${flightId}`);
      return res.status(201).json({
        message: 'Flight added or updated successfully.',
        flightId
      });
    } else {
      return res.status(500).json({ error: 'Could not retrieve flight ID after procedure.' });
    }
  } catch (err) {
    console.error('❌ Error adding/updating flight:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

const getFilteredFlights = async (req, res) => {
  const { departure_time, arrival_time } = req.query;

  console.log("\n🔍 Request to getFilteredFlights");
  console.log("➡️ Received Query Params:", { departure_time, arrival_time });

  if (!departure_time || !arrival_time) {
    console.log("❌ ERROR: Missing required query parameters.");
    return res.status(400).json({ error: 'Both departure_time and arrival_time are required' });
  }

  try {
    const pool = await connectToDatabase();
    console.log("✅ Connected to Database");

    const result = await pool.request()
      .input('departure_time', departure_time)
      .input('arrival_time', arrival_time)
      .query(`
        SELECT * FROM Flights
        WHERE departure_time >= @departure_time AND arrival_time <= @arrival_time
      `);

    console.log("🎯 Flights Fetched:", result.recordset.length);
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ ERROR fetching flights:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getAirportsForLocation = async (req, res) => {
  const { location } = req.query;

  console.log("\n🔍 Request to getAirportsForLocation");
  console.log("➡️ Received Query Param: location =", location);

  if (!location) {
    console.log("❌ ERROR: No location parameter provided.");
    return res.status(400).json({ error: "Location parameter is required." });
  }

  try {
    const pool = await connectToDatabase();
    console.log("✅ Connected to Database");

    const request = pool.request();
    request.input("location", location);

    console.log("🔎 Searching for location ID...");
    const locationResult = await request.query(`
      SELECT id FROM Location WHERE name = @location OR country = @location
    `);

    if (locationResult.recordset.length === 0) {
      console.log("⚠️ WARNING: No matching location found.");
      return res.status(404).json({ error: "Location not found." });
    }

    const locationIds = locationResult.recordset.map(row => row.id);
    console.log("✅ Found Location IDs:", locationIds);

    console.log("🔎 Fetching airports for location...");
    const airportsResult = await pool.request()
      .query(`SELECT code FROM Airport WHERE location_id IN (${locationIds.join(",")})`);

    if (airportsResult.recordset.length === 0) {
      console.log("⚠️ WARNING: No airports found for this location.");
      return res.status(404).json({ error: "No airports found for the given location." });
    }

    console.log("🎯 Airports Fetched:", airportsResult.recordset.length);
    res.json(airportsResult.recordset);
  } catch (err) {
    console.error("❌ ERROR fetching airports for location:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

const getConnectedAirports = async (req, res) => {
  const { airportCode } = req.params;

  if (!airportCode) {
    return res.status(400).json({ error: "Airport code is required." });
  }

  try {
    const pool = await connectToDatabase();
    const request = pool.request();
    request.input("airportCode", airportCode);

    const result = await request.query(`
            SELECT DISTINCT A2.code AS connected_airport_code
            FROM Airport_Airport AA
            JOIN Airport A1 ON AA.origin_id = A1.id
            JOIN Airport A2 ON AA.destination_id = A2.id
            WHERE A1.code = @airportCode
        `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "No connected airports found." });
    }

    const connectedAirports = result.recordset.map(row => row.connected_airport_code);
    res.json(connectedAirports);
  } catch (err) {
    console.error("❌ Error fetching connected airports:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

const getStoredFlights = async (req, res) => {
  console.log("REQUEST: getStoredFlights");
  console.log("Request Body:", JSON.stringify(req.body));

  const { fromAirports, toAirports, periodStart, periodEnd } = req.body;

  if (!fromAirports || !toAirports || !periodStart || !periodEnd) {
    console.error("ERROR: Missing required parameters. Received:", JSON.stringify(req.body));
    return res.status(400).json({ error: 'Missing required parameters.' });
  }

  try {
    const pool = await connectToDatabase();
    console.log("Database Connection: SUCCESS");

    const request = pool.request();
    console.log("Parameters Received:");
    console.log("  fromAirports:", fromAirports);
    console.log("  toAirports:", toAirports);
    console.log("  periodStart:", periodStart);
    console.log("  periodEnd:", periodEnd);

    const fromAirportsList = fromAirports.map(a => `'${a}'`).join(",");
    const toAirportsList = toAirports.map(a => `'${a}'`).join(",");
    console.log("Converted fromAirportsList:", fromAirportsList);
    console.log("Converted toAirportsList:", toAirportsList);

    const query = `
      SELECT
        f.id AS flight_id,
        f.flight_number,
        f.departure_time,
        f.arrival_time,
        f.duration,
        f.aircompany,
        f.price,
        f.sold_out,
        f.unavailable,
        f.inserted_on,
        a_from.code AS from_airport,
        a_to.code AS to_airport
      FROM Flight f
      INNER JOIN Airport_Flight af_from ON f.id = af_from.flight_id
      INNER JOIN Airport a_from ON af_from.airport_id = a_from.id
      INNER JOIN Airport_Flight af_to ON f.id = af_to.flight_id
      INNER JOIN Airport a_to ON af_to.airport_id = a_to.id
      WHERE af_from.type = 'Departure Airport'
        AND af_to.type = 'Arrival Airport'
        AND a_from.code IN (${fromAirportsList})
        AND a_to.code IN (${toAirportsList})
        AND f.departure_time BETWEEN @periodStart AND @periodEnd
      ORDER BY f.departure_time ASC, f.price ASC;
    `;
    console.log("Constructed SQL Query:", query);

    request.input('periodStart', periodStart);
    request.input('periodEnd', periodEnd);
    console.log("SQL Inputs set: periodStart =", periodStart, ", periodEnd =", periodEnd);

    const result = await request.query(query);
    console.log("SQL Query executed successfully.");
    console.log("Number of records fetched:", result.recordset.length);
    console.log("Recordset:", result.recordset);

    if (result.recordset.length === 0) {
      console.warn("No flights found for direct flight query, returning empty array.");
      return res.json([]);
    }

    console.log("Returning response with flight data.");
    res.json(result.recordset);
  } catch (error) {
    console.error("Exception caught while fetching stored flights:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};



module.exports = { getAirportCodes, getLocations, addFlight, getFilteredFlights, getAirportsForLocation, getConnectedAirports, getStoredFlights };
