const sql = require('mssql');

let appRoleActivated = false;

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

const regularUserGetDbConfig = () => {
  return {
    user: 'DB_Admin',
    password: 'Admin12345678',
    server: "DESKTOP-1P6BQ5T\\MABPSERVER",
    database: 'Ryanair-scrapper',
    options: {
      encrypt: false,
      enableArithAbort: true,
    }
  };
};

const connectToDatabase = async (isAdmin = false) => {
  const impersonateDemo = false;
  const applicationRole = false;
  try {
    let dbConfig;
    if (impersonateDemo || applicationRole) {
      dbConfig = getDbConfig(isAdmin);
    }
    else {
      dbConfig = regularUserGetDbConfig()
    }
    const connection = await sql.connect(dbConfig);

    if (!isAdmin) {
      if (impersonateDemo) {
        // Impersonate
        await connection.request().query("EXECUTE AS USER = 'ryanair_scrapper_application'");
        console.log("✅ Database connection established with impersonation");
      }
      else if (applicationRole && !appRoleActivated) {
        // Use application role
        console.log("✅ Database connection established with Application Role APP_Uloga");
        await connection.request()
          .batch("EXEC sp_setapprole 'APP_Uloga','App12345678', none;");
        appRoleActivated = true;
      }
    }

    return connection;
  } catch (err) {
    console.error('Database connection failed:', err);
    throw err;
  }
};

module.exports = connectToDatabase;
