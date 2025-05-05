const connectToDatabase = require('../db/db.config');
const sql = require('mssql');

const getAirportCodes = async (req, res) => {
  try {
    const pool = await connectToDatabase();
    const result = await pool.request().query('SELECT code FROM [Sifrarnik].Airport');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching airport codes:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getLocations = async (req, res) => {
  try {
    const pool = await connectToDatabase();
    const result = await pool.request().query('SELECT name, country FROM [Sifrarnik].Location');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching locations:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const addFlight = async (req, res) => {
  const { from, to, departure_time, arrival_time, duration, price, sold_out, unavailable, flight_number } = req.body;
  console.log(`Inserting or updating flight: ${from} -> ${to} - departure_time: ${departure_time} - arrival_time: ${arrival_time}`);

  if (!from || !to || !departure_time || !arrival_time || !duration ||
    price === undefined || sold_out === undefined || unavailable === undefined) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    const pool = await connectToDatabase();

    // Insert Airplane (default)
    const airplaneResult = await pool.request()
      .input('model', 'Boeing 737')
      .input('registration', null)
      .input('capacity', 150)
      .query(`
        INSERT INTO [IO].Airplane (model, registration, capacity)
        OUTPUT INSERTED.id
        VALUES (@model, @registration, @capacity);
      `);

    if (airplaneResult.recordset.length === 0) {
      return res.status(500).json({ error: 'Could not insert airplane.' });
    }

    const airplaneId = airplaneResult.recordset[0].id;
    console.log(`✅ Airplane inserted with ID: ${airplaneId}`);

    // Insert flight
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
      .input('airplane_id', airplaneId)
      .input('from_code', from)
      .input('to_code', to);

    const result = await request.execute('sp_AddOrUpdateFlight');

    if (result.recordset.length > 0) {
      const flightId = result.recordset[0].id;
      console.log(`✅ Flight upserted with ID: ${flightId}`);

      // Fetch all flight categories
      const categoryResult = await pool.request().query(`SELECT id FROM [Sifrarnik].Flight_category`);
      const categories = categoryResult.recordset.map(row => row.id);

      // Connect the flight with all categories (default)
      if (categories.length > 0) {
        const insertRequest = pool.request();
        const values = categories.map((categoryId, index) => `(@flightId, @categoryId${index})`).join(", ");

        insertRequest.input('flightId', flightId);
        categories.forEach((categoryId, index) => {
          insertRequest.input(`categoryId${index}`, categoryId);
        });

        const insertQuery = `INSERT INTO [IO].Flight_Flight_category (flight_id, category_id) VALUES ${values}`;
        await insertRequest.query(insertQuery);

        console.log(`✅ Inserted ${categories.length} categories for flight ID: ${flightId}`);
      }

      return res.status(201).json({
        message: 'Flight and airplane added successfully.',
        flightId,
        airplaneId
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
        SELECT * FROM [IO].Flights
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
      SELECT id FROM [Sifrarnik].Location WHERE name = @location OR country = @location
    `);

    if (locationResult.recordset.length === 0) {
      console.log("⚠️ WARNING: No matching location found.");
      return res.status(404).json({ error: "Location not found." });
    }

    const locationIds = locationResult.recordset.map(row => row.id);
    console.log("✅ Found Location IDs:", locationIds);

    console.log("🔎 Fetching airports for location...");
    const airportsResult = await pool.request()
      .query(`SELECT code FROM [Sifrarnik].Airport WHERE location_id IN (${locationIds.join(",")})`);

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
            FROM [IO].Airport_Airport AA
            JOIN [Sifrarnik].Airport A1 ON AA.origin_id = A1.id
            JOIN [Sifrarnik].Airport A2 ON AA.destination_id = A2.id
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
      FROM [IO].Flight f
      INNER JOIN [IO].Airport_Flight af_from ON f.id = af_from.flight_id
      INNER JOIN [IO].Airport a_from ON af_from.airport_id = a_from.id
      INNER JOIN [IO].Airport_Flight af_to ON f.id = af_to.flight_id
      INNER JOIN [Sifrarnik].Airport a_to ON af_to.airport_id = a_to.id
      WHERE af_from.type = 'Departure Airport'
        AND af_to.type = 'Arrival Airport'
        AND a_from.code IN (${fromAirportsList})
        AND a_to.code IN (${toAirportsList})
        AND f.departure_time BETWEEN @periodStart AND @periodEnd
      ORDER BY f.departure_time ASC, f.price ASC;
    `;
    // console.log("Constructed SQL Query:", query);

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

const getLocationDetails = async (req, res) => {
  const { selection } = req.query;
  if (!selection) {
    return res.status(400).json({ error: "Selection parameter is required." });
  }
  try {
    const pool = await connectToDatabase();
    const result = await pool.request()
      .input("selection", selection)
      .query(`SELECT TOP 1 name, country FROM [Sifrarnik].Location WHERE name = @selection OR country = @selection`);
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Location not found." });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    console.error("Error fetching location details:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

const getLocationByAirport = async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: "Airport code is required." });
  }
  try {
    const pool = await connectToDatabase();
    const result = await pool.request()
      .input("code", code)
      .query(`SELECT L.name, L.country FROM [Sifrarnik].Airport A JOIN [Sifrarnik].Location L ON A.location_id = L.id WHERE A.code = @code`);
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Location for the given airport code not found." });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    console.error("Error fetching location by airport code:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

const addTravel = async (req, res) => {
  const {
    total_duration,
    number_of_flights,
    start_airport,       // ovdje je code, npr. "ZAG"
    destination_airport, // ovdje je code, npr. "WRO"
    number_of_persons,
    period_start,
    period_end
  } = req.body;

  console.log(`Inserting travel record: ${start_airport} -> ${destination_airport}`);
  console.log("Travel record payload:", JSON.stringify(req.body, null, 2));

  if (
    total_duration == null || total_duration <= 0 ||
    !number_of_flights ||
    !start_airport ||
    !destination_airport ||
    !number_of_persons ||
    !period_start ||
    !period_end
  ) {
    return res.status(400).json({ error: "Missing or invalid required travel fields." });
  }

  try {
    const pool = await connectToDatabase();

    // 1) INSERT to Travel table
    const travelReq = pool.request();
    travelReq
      .input('total_duration', total_duration)
      .input('number_of_flights', number_of_flights)
      .input('number_of_persons', number_of_persons)
      .input('period_start', period_start)
      .input('period_end', period_end);

    const insertTravelQ = `
      INSERT INTO [IO].Travel
        (total_duration, number_of_flights, number_of_persons, period_start, period_end, inserted_on)
      VALUES
        (@total_duration, @number_of_flights, @number_of_persons, @period_start, @period_end, GETDATE());
      SELECT CAST(SCOPE_IDENTITY() AS INT) AS travelId;
    `;
    console.log("Executing INSERT Travel:", insertTravelQ);
    const travelResult = await travelReq.query(insertTravelQ);

    if (!travelResult.recordset.length) {
      return res.status(500).json({ error: 'Could not retrieve travel ID after insert.' });
    }
    const travelId = travelResult.recordset[0].travelId;
    console.log(`✅ Travel inserted with ID: ${travelId}`);

    // 2) SELECT airport_id for start_airport
    const startSel = await pool.request()
      .input('code', start_airport)
      .query(`SELECT id FROM [Sifrarnik].[Airport] WHERE code = @code`);
    if (!startSel.recordset.length) {
      return res.status(400).json({ error: `Unknown start airport code: ${start_airport}` });
    }
    const startAirportId = startSel.recordset[0].id;

    // 3) SELECT airport_id for destination_airport
    const destSel = await pool.request()
      .input('code', destination_airport)
      .query(`SELECT id FROM [Sifrarnik].[Airport] WHERE code = @code`);
    if (!destSel.recordset.length) {
      return res.status(400).json({ error: `Unknown destination airport code: ${destination_airport}` });
    }
    const destAirportId = destSel.recordset[0].id;

    // 4) INSERT to Travel_Airport table
    const taReq = pool.request();
    taReq
      .input('travel_id', travelId)
      .input('startAirport', startAirportId)
      .input('destAirport', destAirportId);

    const insertTAQ = `
      INSERT INTO [IO].Travel_Airport (travel_id, airport_id, type)
      VALUES
        (@travel_id, @startAirport, 'Start'),
        (@travel_id, @destAirport,  'Destination');
    `;
    console.log("Executing INSERT Travel_Airport:", insertTAQ);
    await taReq.query(insertTAQ);

    return res.status(201).json({
      message: 'Travel added successfully.',
      travelId
    });

  } catch (err) {
    console.error("❌ Error adding travel:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};

const addTravelFlight = async (req, res) => {
  const { travel_id, flight_id } = req.body;
  console.log(`Linking travel ID ${travel_id} with flight ID ${flight_id}`);
  console.log("TravelFlight payload:", JSON.stringify(req.body, null, 2));

  if (!travel_id || !flight_id) {
    return res.status(400).json({ error: "Missing travel_id or flight_id." });
  }
  try {
    const pool = await connectToDatabase();
    const request = pool.request();
    request.input('travel_id', travel_id)
      .input('flight_id', flight_id);

    const insertQuery = `
      INSERT INTO [IO].Travel_Flight (travel_id, flight_id)
      VALUES (@travel_id, @flight_id);
      SELECT SCOPE_IDENTITY() AS joinId;
    `;
    console.log("Executing INSERT query for Travel_Flight:");
    console.log(insertQuery);

    const result = await request.query(insertQuery);
    console.log("Insert query result:", JSON.stringify(result, null, 2));
    if (result.recordset.length > 0) {
      const joinId = result.recordset[0].joinId;
      console.log(`✅ Travel-flight link inserted with join ID: ${joinId}`);
      return res.status(201).json({
        message: 'Travel-flight link added successfully.',
        joinId
      });
    } else {
      return res.status(500).json({ error: 'Could not retrieve join ID after insert.' });
    }
  } catch (err) {
    console.error("❌ Error adding travel-flight link:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};

const getStoredTravels = async (req, res) => {
  console.log("REQUEST: getStoredTravels");
  console.log("Request Body:", JSON.stringify(req.body));

  const { from, to, periodStart, periodEnd } = req.body;

  if (!from || !periodStart || !periodEnd) {
    console.error("ERROR: Missing required parameters. Received:", JSON.stringify(req.body));
    return res.status(400).json({ error: 'Missing required parameters.' });
  }

  try {
    const pool = await connectToDatabase();
    console.log("Database Connection: SUCCESS");

    const request = pool.request();
    request.input('fromCity', sql.NVarChar, from);
    request.input('periodStart', sql.Date, periodStart);
    request.input('periodEnd', sql.Date, periodEnd);
    if (req.body.to && req.body.to !== "") {
      request.input('toCity', sql.NVarChar, to);
    }

    const result = await request.execute('sp_GetStoredTravels');

    console.log("SQL Query executed successfully. Records fetched:", result.recordset.length);

    if (result.recordset.length === 0) {
      console.warn("No travels found for the given criteria.");
      return res.json([]);
    }

    console.log("Returning stored travels data.");
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Exception caught while fetching stored travels:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getTravelFlights = async (req, res) => {
  const { travelId } = req.params;
  if (!travelId) {
    return res.status(400).json({ error: "Missing travelId parameter." });
  }

  try {
    const pool = await connectToDatabase();
    console.log("Database Connection: SUCCESS");

    const request = pool.request();
    request.input("travelId", sql.Int, travelId);

    const query = `
      SELECT
        F.id,
        F.flight_number,
        F.departure_time,
        F.arrival_time,
        F.duration,
        F.aircompany,
        F.price,
        F.sold_out,
        F.unavailable,
        F.airplane_id,
        F.inserted_on,
        a_from.code AS from_airport,
        a_to.code AS to_airport
      FROM [IO].Flight F
      INNER JOIN [IO].Travel_Flight TF ON F.id = TF.flight_id
      INNER JOIN [IO].Airport_Flight AF_from ON F.id = AF_from.flight_id AND AF_from.type = 'Departure Airport'
      INNER JOIN [Sifrarnik].Airport a_from ON AF_from.airport_id = a_from.id
      INNER JOIN [IO].Airport_Flight AF_to ON F.id = AF_to.flight_id AND AF_to.type = 'Arrival Airport'
      INNER JOIN [Sifrarnik].Airport a_to ON AF_to.airport_id = a_to.id
      WHERE TF.travel_id = @travelId
      ORDER BY F.departure_time ASC;
    `;
    console.log("Executing SQL Query for getTravelFlights:");
    console.log(query);

    const result = await request.query(query);
    console.log("SQL Query executed successfully. Records fetched:", result.recordset.length);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Exception caught while fetching travel flights:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


const saveTravel = async (req, res) => {
  try {
    const { user_id, travel_id } = req.body;

    if (!user_id || !travel_id) {
      return res.status(400).json({ success: false, message: "User ID and Travel ID are required." });
    }

    const pool = await connectToDatabase();

    const checkExisting = await pool
      .request()
      .input("userId", user_id)
      .input("travelId", travel_id)
      .query("SELECT * FROM [IO].[User_Travel] WHERE user_id = @userId AND travel_id = @travelId");

    if (checkExisting.recordset.length > 0) {
      return res.status(409).json({ success: false, message: "Travel is already saved." });
    }

    await pool
      .request()
      .input("userId", user_id)
      .input("travelId", travel_id)
      .query("INSERT INTO [IO].[User_Travel] (user_id, travel_id) VALUES (@userId, @travelId)");

    return res.json({ success: true, message: "Travel saved successfully!" });
  } catch (err) {
    console.error("Error saving travel:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};


const getSavedTravels = async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ success: false, message: "User ID is required." });
    }

    const pool = await connectToDatabase();
    const result = await pool.request()
      .input('userId', sql.Int, user_id)
      .query(`
        SELECT
          t.id,
          t.number_of_persons,
          t.period_start,
          t.period_end,
          t.total_duration,
          startA.code    AS start_airport,
          startL.name    AS start_city,
          startL.country AS start_country,
          destA.code     AS destination_airport,
          destL.name     AS destination_city,
          destL.country  AS destination_country,
          -- ukupna cijena
          (SELECT SUM(f.price)
           FROM [IO].[Flight] f
           JOIN [IO].[Travel_Flight] tf ON f.id = tf.flight_id
           WHERE tf.travel_id = t.id
          ) AS total_price,
          -- vrijeme leta u minutama
          (SELECT SUM(DATEDIFF(MINUTE, f.departure_time, f.arrival_time))
           FROM [IO].[Flight] f
           JOIN [IO].[Travel_Flight] tf ON f.id = tf.flight_id
           WHERE tf.travel_id = t.id
          ) AS total_flight_time,
          -- vrijeme čekanja u minutama
          DATEDIFF(MINUTE, '00:00:00', t.total_duration)
            - (SELECT SUM(DATEDIFF(MINUTE, f.departure_time, f.arrival_time))
               FROM [IO].[Flight] f
               JOIN [IO].[Travel_Flight] tf ON f.id = tf.flight_id
               WHERE tf.travel_id = t.id
              ) AS total_wait_time,
          -- broj letova
          (SELECT COUNT(*)
           FROM [IO].[Travel_Flight] tf
           WHERE tf.travel_id = t.id
          ) AS number_of_flights,
          -- svi aerodromi u putovanju, u redu leta
          STUFF((
            SELECT ' ' + NCHAR(8594) + ' ' + A2.code
            FROM [IO].[Travel_Flight] tf2
            JOIN [IO].[Flight] f2           ON tf2.flight_id = f2.id
            JOIN [IO].[Airport_Flight] af2  ON f2.id = af2.flight_id
            JOIN [Sifrarnik].[Airport] A2   ON af2.airport_id = A2.id
            WHERE tf2.travel_id = t.id
            GROUP BY A2.code
            ORDER BY MIN(f2.departure_time)
            FOR XML PATH(''), TYPE
          ).value('.', 'NVARCHAR(MAX)'), 1, 3, '') AS all_airports_in_order
        FROM [IO].[Travel] t
        JOIN [IO].[User_Travel]    ut   ON ut.travel_id = t.id AND ut.user_id = @userId
        JOIN [IO].[Travel_Airport] tas  ON tas.travel_id = t.id AND tas.type = 'Start'
        JOIN [Sifrarnik].[Airport] startA ON startA.id = tas.airport_id
        JOIN [Sifrarnik].[Location] startL ON startL.id = startA.location_id
        JOIN [IO].[Travel_Airport] tad  ON tad.travel_id = t.id AND tad.type = 'Destination'
        JOIN [Sifrarnik].[Airport] destA  ON destA.id = tad.airport_id
        JOIN [Sifrarnik].[Location] destL  ON destL.id = destA.location_id
        ORDER BY t.inserted_on DESC;
      `);

    return res.json({ success: true, travels: result.recordset });
  } catch (err) {
    console.error("Error fetching saved travels:", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};


const removeSavedTravel = async (req, res) => {
  try {
    const { user_id, travel_id } = req.body;

    if (!user_id || !travel_id) {
      return res.status(400).json({ success: false, message: "User ID and Travel ID are required." });
    }

    const pool = await connectToDatabase();

    const deleteResult = await pool
      .request()
      .input("userId", user_id)
      .input("travelId", travel_id)
      .query(`
        DELETE FROM [IO].[User_Travel] WHERE user_id = @userId AND travel_id = @travelId
      `);

    if (deleteResult.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: "Saved travel not found." });
    }

    return res.json({ success: true, message: "Saved travel removed successfully." });
  } catch (err) {
    console.error("❌ Error removing saved travel:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getSavedTravel = async (req, res) => {
  try {
    const { user_id, travel_id } = req.body;

    if (!user_id || !travel_id) {
      return res.status(400).json({ success: false, message: "User ID and Travel ID are required." });
    }

    const pool = await connectToDatabase();

    const result = await pool
      .request()
      .input("userId", user_id)
      .input("travelId", travel_id)
      .query(`
        SELECT 1 FROM [IO].[User_Travel] WHERE user_id = @userId AND travel_id = @travelId
      `);

    const isSaved = result.recordset.length > 0;

    return res.json({ success: isSaved, message: isSaved ? "Travel is saved." : "Travel not saved." });
  } catch (err) {
    console.error("❌ Error checking saved travel:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getBaggageByUser = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, message: "User ID is required." });
  }

  try {
    const pool = await connectToDatabase();
    const result = await pool.request()
      .input("userId", userId)
      .query("SELECT * FROM [IO].Baggage WHERE user_id = @userId");

    res.json({ success: true, baggage: result.recordset });
  } catch (err) {
    console.error("Error fetching baggage:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const addBaggage = async (req, res) => {
  const { brand, color, width, height, depth, wheels_count, has_tracker, user_id } = req.body;

  if (!color || !width || !height || !depth || !user_id) {
    return res.status(400).json({ success: false, message: "Missing required fields." });
  }

  try {
    const pool = await connectToDatabase();
    await pool.request()
      .input("brand", brand || null)
      .input("color", color)
      .input("width", width)
      .input("height", height)
      .input("depth", depth)
      .input("wheels_count", wheels_count || null)
      .input("has_tracker", has_tracker || false)
      .input("user_id", user_id)
      .query(`
        INSERT INTO [IO].Baggage (brand, color, width, height, depth, wheels_count, has_tracker, user_id)
        VALUES (@brand, @color, @width, @height, @depth, @wheels_count, @has_tracker, @user_id)
      `);

    res.json({ success: true, message: "Baggage added successfully." });
  } catch (err) {
    console.error("Error adding baggage:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const updateBaggage = async (req, res) => {
  const { id, brand, color, width, height, depth, wheels_count, has_tracker, user_id } = req.body;

  if (!id || !color || !width || !height || !depth || !user_id) {
    return res.status(400).json({ success: false, message: "Missing required fields." });
  }

  try {
    const pool = await connectToDatabase();
    await pool.request()
      .input("id", id)
      .input("brand", brand || null)
      .input("color", color)
      .input("width", width)
      .input("height", height)
      .input("depth", depth)
      .input("wheels_count", wheels_count || null)
      .input("has_tracker", has_tracker || false)
      .input("user_id", user_id)
      .query(`
        UPDATE [IO].Baggage
        SET brand = @brand, color = @color, width = @width, height = @height,
            depth = @depth, wheels_count = @wheels_count, has_tracker = @has_tracker
        WHERE id = @id AND user_id = @user_id
      `);

    res.json({ success: true, message: "Baggage updated successfully." });
  } catch (err) {
    console.error("Error updating baggage:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const deleteBaggage = async (req, res) => {
  const { baggageId } = req.body;

  if (!baggageId) {
    return res.status(400).json({ success: false, message: "Baggage ID is required." });
  }

  try {
    const pool = await connectToDatabase();
    await pool.request()
      .input("baggageId", baggageId)
      .query("DELETE FROM [IO].Baggage WHERE id = @baggageId");

    res.json({ success: true, message: "Baggage deleted successfully." });
  } catch (err) {
    console.error("Error deleting baggage:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const getFlightCategories = async (req, res) => {
  const { flightId } = req.body;

  if (!flightId) {
    return res.status(400).json({ error: 'Flight ID is required in request body.' });
  }

  try {
    const pool = await connectToDatabase();
    const result = await pool.request()
      .input('flightId', flightId)
      .query(`
        SELECT fc.id, fc.category, fc.price_increase_percentage, fc.reserved_seat,
               fc.priority_boarding, fc.cabin_baggage, fc.check_in_baggage,
               fc.change_flight_with_no_fees
        FROM [Sifrarnik].Flight_category fc
        JOIN [IO].Flight_Flight_category ffc ON fc.id = ffc.category_id
        WHERE ffc.flight_id = @flightId
      `);

    res.json({ success: true, categories: result.recordset });
  } catch (err) {
    console.error('❌ Error fetching flight categories:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const getAirplaneById = async (req, res) => {
  const { airplane_id } = req.body;

  if (!airplane_id) {
    return res.status(400).json({ error: 'Missing airplane_id in request body.' });
  }

  try {
    const pool = await connectToDatabase();
    const result = await pool.request()
      .input('airplane_id', airplane_id)
      .query(`SELECT * FROM [IO].Airplane WHERE id = @airplane_id`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Airplane not found.' });
    }

    return res.status(200).json({ success: true, airplane: result.recordset[0] });
  } catch (err) {
    console.error('❌ Error fetching airplane:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

const getPopularLocation = async (req, res) => {
  const { type } = req.body;
  if (type !== "start" && type !== "dest") {
    return res.status(400).json({ success: false, message: "Invalid type. Use 'start' or 'dest'." });
  }

  try {
    const pool = await connectToDatabase();
    const result = await pool
      .request()
      .input("locationType", type)
      .query("EXEC usp_GetMostPopularLocation @locationType");

    if (result.recordset.length === 0) {
      return res.json({ success: true, city: "No data available" });
    }

    res.json({ success: true, city: result.recordset[0].city });
  } catch (err) {
    console.error("Error fetching popular location:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const getFlightVsWaitTime = async (req, res) => {
  const { type } = req.body;
  if (type !== "flight_time" && type !== "wait_time") {
    return res.status(400).json({ success: false, message: "Invalid type. Use 'flight_time' or 'wait_time'." });
  }

  try {
    const pool = await connectToDatabase();
    const result = await pool
      .request()
      .input("timeType", type)
      .query("EXEC usp_FlightVsWaitTime @timeType");

    if (result.recordset.length === 0) {
      return res.json({ success: true, avg_time: 0 });
    }

    res.json({ success: true, avg_time: result.recordset[0].avg_result });
  } catch (err) {
    console.error("Error fetching flight vs wait time:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const getFlightAnalysis = async (req, res) => {
  try {
    const pool = await connectToDatabase();
    const result = await pool.query("EXEC usp_AnalyzeFlights");

    if (result.recordset.length === 0) {
      return res.json({ success: true, avg_price: 0, low_cost: 0, high_cost: 0 });
    }

    const avg_price = result.recordset[0].avg_flight_price;
    const low_cost = result.recordset[0].flights_below_35;
    const high_cost = result.recordset[0].flights_above_35;

    res.json({ success: true, avg_price, low_cost, high_cost });
  } catch (err) {
    console.error("Error fetching flight analysis:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const getTopDestinationsByMonth = async (req, res) => {
  try {
    const pool = await connectToDatabase();
    const result = await pool.query("EXEC usp_TopDestinationsByMonth");

    if (result.recordset.length === 0) {
      return res.json({ success: true, destinations: [] });
    }

    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching top destinations:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const getAllAirports = async (req, res) => {
  try {
    const pool = await connectToDatabase();
    const result = await pool.query(`
            SELECT a.id, a.code, a.latitude, a.longitude, l.name as city
            FROM [Sifrarnik].[Airport] a
            JOIN [Sifrarnik].[Location] l ON a.location_id = l.id
        `);

    res.json({ success: true, airports: result.recordset });
  } catch (err) {
    console.error("Error fetching airports:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const getAirportConnections = async (req, res) => {
  const { id } = req.body;
  try {
    const pool = await connectToDatabase();
    const result = await pool.request()
      .input("id", id)
      .query(`
                SELECT a.id, a.code, a.latitude, a.longitude, l.name as city
                FROM [IO].[Airport_Airport] aa
                JOIN [Sifrarnik].[Airport] a ON aa.destination_id = a.id
                JOIN [Sifrarnik].[Location] l ON a.location_id = l.id
                WHERE aa.origin_id = @id
            `);
    console.log(result, "-id:", id);
    res.json({ success: true, connections: result.recordset });
  } catch (err) {
    console.error("Error fetching airport connections:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

module.exports = {
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
  getAirplaneById,
  getPopularLocation,
  getFlightVsWaitTime,
  getFlightAnalysis,
  getTopDestinationsByMonth,
  getAllAirports,
  getAirportConnections
};
