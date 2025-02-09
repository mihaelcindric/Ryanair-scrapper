const connectToDatabase = require("../db/db.config");

const getFullTableName = (tableName) => {
  const sifrarnikTables = [
    "Flight_category",
    "Airport",
    "Location"
  ];

  const ioTables = [
    "Flight",
    "Travel",
    "Airplane",
    "User_Travel",
    "Baggage",
    "Airport_Airport",
    "Airport_Flight",
    "Flight_Flight_category",
    "Travel_Flight",
    "Travel_Location",
    "User"
  ];

  if (sifrarnikTables.includes(tableName)) {
    return `[Sifrarnik].[${tableName}]`;
  } else if (ioTables.includes(tableName)) {
    return `[IO].[${tableName}]`;
  } else {
    return `[dbo].[${tableName}]`;
  }
};


const getTableSchema = async (req, res) => {
  const { tableName } = req.body;

  try {
    const pool = await connectToDatabase(true);
    const result = await pool.request()
      .input('tableName', tableName)
      .query(`
                SELECT
                    COLUMN_NAME AS column_name,
                    DATA_TYPE AS data_type,
                    IS_NULLABLE AS nullable
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_CATALOG = 'Ryanair-scrapper'
                AND TABLE_NAME = @tableName
                AND COLUMN_NAME != 'id';
            `);

    res.json({ success: true, schema: result.recordset });
  } catch (err) {
    console.error('Error fetching table schema:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const getAllRecords = async (req, res) => {
  const { tableName } = req.body;

  try {
    const pool = await connectToDatabase(true);
    const fullTableName = getFullTableName(tableName);
    const result = await pool.request().query(`SELECT * FROM ${fullTableName}`);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error(`Error fetching data from ${tableName}:`, err);
    res.status(500).json({ success: false, message: `Internal server error.` });
  }
};

const insertRecord = async (req, res) => {
  const { tableName } = req.body;
  const data = req.body.data;

  if (!tableName || !data || Object.keys(data).length === 0) {
    return res.status(400).json({ success: false, message: "Table name and data are required." });
  }

  try {
    const pool = await connectToDatabase(true);
    const fullTableName = getFullTableName(tableName);
    const request = pool.request();
    const columns = Object.keys(data).join(", ");
    const values = Object.keys(data).map((_, i) => `@p${i}`).join(", ");

    Object.entries(data).forEach(([key, value], i) => request.input(`p${i}`, value));
    await request.query(`INSERT INTO ${fullTableName} (${columns}) VALUES (${values})`);

    res.json({ success: true, message: `Inserted into ${tableName}.` });
  } catch (err) {
    console.error(`Error inserting into ${tableName}:`, err);
    res.status(500).json({ success: false, message: `Internal server error.` });
  }
};

const deleteRecord = async (req, res) => {
  const { tableName, id } = req.body;

  if (!tableName || !id) {
    return res.status(400).json({ success: false, message: "Table name and ID are required." });
  }

  try {
    const pool = await connectToDatabase(true);
    const fullTableName = getFullTableName(tableName);
    const request = pool.request();

    request.input("id", id);
    const query = `DELETE FROM ${fullTableName} WHERE id = @id`;

    await request.query(query);

    res.json({ success: true, message: `Record with ID ${id} deleted from ${tableName}.` });
  } catch (err) {
    console.error(`Error deleting record from ${tableName}:`, err);
    res.status(500).json({ success: false, message: `Internal server error.` });
  }
};


const insertAirportAirport = async (req, res) => {
  const { originIata, destinationIata } = req.body;

  if (!originIata || !destinationIata) {
    return res.status(400).json({ success: false, message: "Both originIata and destinationIata are required." });
  }

  try {
    const pool = await connectToDatabase(true);

    const originResult = await pool.request()
      .input("originIata", originIata)
      .query("SELECT id FROM [Sifrarnik].[Airport] WHERE code = @originIata");

    const destinationResult = await pool.request()
      .input("destinationIata", destinationIata)
      .query("SELECT id FROM [Sifrarnik].[Airport] WHERE code = @destinationIata");

    if (originResult.recordset.length === 0 || destinationResult.recordset.length === 0) {
      return res.status(404).json({ error: "One or both airport codes not found in the database." });
    }

    const originId = originResult.recordset[0].id;
    const destinationId = destinationResult.recordset[0].id;

    await pool.request()
      .input("origin_id", originId)
      .input("destination_id", destinationId)
      .query(`
        INSERT INTO [IO].[Airport_Airport] (origin_id, destination_id)
        VALUES (@origin_id, @destination_id)
      `);

    res.status(201).json({ message: "Airport relationship added successfully." });
  } catch (err) {
    console.error("Error inserting airport relationship:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

const getLocationByName = async (req, res) => {
  const { city, country } = req.query;

  if (!city || !country) {
    return res.status(400).json({ success: false, message: "City and country are required." });
  }

  try {
    const pool = await connectToDatabase(true);
    const result = await pool
      .request()
      .input("city", city)
      .input("country", country)
      .query(`
        SELECT id FROM [Sifrarnik].[Location] WHERE name = @city AND country = @country
      `);

    if (result.recordset.length > 0) {
      res.json({ success: true, id: result.recordset[0].id });
    } else {
      res.status(404).json({ success: false, message: "Location not found." });
    }
  } catch (err) {
    console.error("Error fetching location by name:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const updateRecord = async (req, res) => {
  const { tableName, data } = req.body;

  if (!data || !data.id) {
    return res.status(400).json({ success: false, message: "ID is required for update." });
  }

  try {
    const pool = await connectToDatabase(true);
    const fullTableName = getFullTableName(tableName);
    const request = pool.request();

    const updateFields = [];
    let paramIndex = 0;

    for (const [key, value] of Object.entries(data)) {
      if (key !== "id") {
        updateFields.push(`[${key}] = @p${paramIndex}`);
        request.input(`p${paramIndex}`, value);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields provided for update." });
    }

    request.input("id", data.id);
    const query = `UPDATE ${fullTableName} SET ${updateFields.join(", ")} WHERE id = @id`;

    console.log("Executing query:", query);
    await request.query(query);

    res.json({ success: true, message: `Record updated successfully in ${tableName}.` });

  } catch (err) {
    console.error(`Error updating record in ${tableName}:`, err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};




module.exports = {
  getTableSchema,
  getAllRecords,
  insertRecord,
  deleteRecord,
  getLocationByName,
  insertAirportAirport,
  updateRecord
};
