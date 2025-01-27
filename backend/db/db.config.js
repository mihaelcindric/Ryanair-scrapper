const sql = require('mssql');

const dbConfig = {
  user: 'ryanair_scrapper_application',
  password: '12345678',
  server: "DESKTOP-1P6BQ5T\\MABPSERVER",
  database: 'Ryanair-scrapper',
  options: {
    encrypt: false, // Set to True if using SSL
    enableArithAbort: true,
  },
};

const connectToDatabase = async () => {
  try {
    return await sql.connect(dbConfig);
  } catch (err) {
    console.error('Database connection failed:', err);
    throw err;
  }
};

module.exports = connectToDatabase;
