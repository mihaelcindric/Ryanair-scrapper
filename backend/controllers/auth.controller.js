const connectToDatabase = require("../db/db.config");
const sql = require("mssql");

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const pool = await connectToDatabase();
    const result = await pool
      .request()
      .input("email", email)
      .query("SELECT id, first_name, last_name, date_of_birth, username, email, profile_picture_url, is_admin, password FROM [IO].[User] WHERE email = @email");

    if (result.recordset.length === 0) {
      return res
        .status(403)
        .json({ success: false, message: "Invalid email or password." });
    }

    const user = result.recordset[0];

    const decryptionResult = await pool
      .request()
      .input("encryptedPassword", user.password)
      .output("decryptedPassword", "")
      .execute("desifriraj");

    const decryptedPassword = decryptionResult.output.decryptedPassword;

    if (password !== decryptedPassword) {
      return res
        .status(403)
        .json({ success: false, message: "Invalid email or password." });
    }

    delete user.password;

    res.json({ success: true, message: "Login successful!", user: user, password: decryptedPassword });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const register = async (req, res) => {
  const { first_name, last_name, date_of_birth, username, email, password, profile_picture_url } = req.body;

  try {
    const pool = await connectToDatabase();

    // Check if a user with the same email/username already exists
    const existingUser = await pool
      .request()
      .input('email', email)
      .input('username', username)
      .query('SELECT * FROM [IO].[User] WHERE email = @email OR username = @username');

    if (existingUser.recordset.length > 0) {
      return res.status(400).json({ success: false, message: 'User with this email or username already exists.' });
    }

    const encryptionResult = await pool
      .request()
      .input("plainPassword", password)
      .output("encryptedPassword", sql.VarBinary)
      .execute("sifriraj");

    const encryptedPassword = encryptionResult.output.encryptedPassword;

    await pool
      .request()
      .input('first_name', first_name)
      .input('last_name', last_name)
      .input('date_of_birth', date_of_birth)
      .input('username', username)
      .input('email', email)
      .input('password', encryptedPassword)
      .input('profile_picture_url', profile_picture_url || null)
      .input('is_admin', 0)
      .query(`
        INSERT INTO [IO].[User] (first_name, last_name, date_of_birth, username, email, password, profile_picture_url)
        VALUES (@first_name, @last_name, @date_of_birth, @username, @email, @password, @profile_picture_url)
      `);

    res.status(201).json({ success: true, message: 'User registered successfully!' });
  } catch (err) {
    console.error('Error during registration:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const pool = await connectToDatabase();
    const result = await pool
      .request()
      .input("userId", req.user.id)
      .query(`
        SELECT id, username, email, profile_picture_url, is_admin,
               first_name, last_name, date_of_birth
        FROM [IO].[User]
        WHERE id = @userId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({ success: true, user: result.recordset[0] });
  } catch (err) {
    console.error("Error fetching current user:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updateProfile = async (req, res) => {
  const { id, first_name, last_name, username, email, profile_picture_url, current_password, new_password } = req.body;

  try {
    const pool = await connectToDatabase();

    const userQuery = await pool.request()
      .input('id', id)
      .query('SELECT password FROM [IO].[User] WHERE id = @id');

    if (userQuery.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = userQuery.recordset[0];

    const decryptionResult = await pool
      .request()
      .input("encryptedPassword", user.password)
      .output("decryptedPassword", "")
      .execute("desifriraj");

    const decryptedPassword = decryptionResult.output.decryptedPassword;

    // Check password
    if (current_password !== decryptedPassword) {
      return res.status(403).json({ success: false, message: 'Invalid current password.' });
    }

    let updateQuery = `
      UPDATE [IO].[User]
      SET first_name = @first_name, last_name = @last_name, username = @username,
          email = @email, profile_picture_url = @profile_picture_url
    `;

    const request = pool.request()
      .input('id', id)
      .input('first_name', first_name)
      .input('last_name', last_name)
      .input('username', username)
      .input('email', email)
      .input('profile_picture_url', profile_picture_url);

    if (new_password) {
      // Šifriraj novu lozinku pomoću procedure
      const encryptionResult = await pool
        .request()
        .input("plainPassword", new_password)
        .output("encryptedPassword", sql.VarBinary)
        .execute("sifriraj");

      const encryptedPassword = encryptionResult.output.encryptedPassword;

      updateQuery += `, password = @password`;
      request.input('password', encryptedPassword);
    }

    updateQuery += ` WHERE id = @id`;

    await request.query(updateQuery);

    res.json({ success: true, message: 'Profile updated successfully!' });

  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};




module.exports = {
  register,
  login,
  getCurrentUser,
  updateProfile
};
