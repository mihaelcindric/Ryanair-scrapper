const sql = require('mssql');

const getDbConfig = (isAdmin) => {
  return {
    user: isAdmin ? 'DB_Admin' : 'Korisnik',
    password: isAdmin ? 'Admin12345678' : '12345678',
    server: "DESKTOP-1P6BQ5T\\MABPSERVER",
    database: 'Ryanair-scrapper',
    options: {
      encrypt: false,
      enableArithAbort: true,
    }
  };
};

const connectToDatabase = async (isAdmin = false) => {
  const impersonateDemo = true;
  try {
    const dbConfig = getDbConfig(isAdmin);
    const connection =  await sql.connect(dbConfig);

    let shouldSetAppRole = false;

    if (!isAdmin) {
      if (impersonateDemo) {
        // Impersonate
        await connection.request().query("EXECUTE AS USER = 'ryanair_scrapper_application'");
        console.log("✅ Database connection established with impersonation");
      }
      else {
        // Use application role
        console.log("✅ Database connection established with Application Role APP_Uloga");
        await connection.request().query("EXEC sp_setapprole 'APP_Uloga', 'App12345678', none");
        shouldSetAppRole = true;
      }
    }

    return connection;
  } catch (err) {
    console.error('Database connection failed:', err);
    throw err;
  }
};

module.exports = connectToDatabase;
