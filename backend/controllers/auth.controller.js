const connectToDatabase = require("../db/db.config");
const bcrypt = require("bcrypt");

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const pool = await connectToDatabase();
    const result = await pool
      .request()
      .input("email", email)
      .query("SELECT * FROM [User] WHERE email = @email");

    if (result.recordset.length === 0) {
      return res
        .status(403)
        .json({ success: false, message: "Invalid email or password." });
    }

    const user = result.recordset[0];

    // Compare the passwords
    const passwordMatch = await bcrypt.compare(password, Buffer.from(user.password).toString("utf-8"));

    if (!passwordMatch) {
      return res
        .status(403)
        .json({ success: false, message: "Invalid email or password." });
    }

    res.json({ success: true, message: "Login successful!" });
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
      .query('SELECT * FROM [User] WHERE email = @email OR username = @username');

    if (existingUser.recordset.length > 0) {
      return res.status(400).json({ success: false, message: 'User with this email or username already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Write a new user to db
    await pool
      .request()
      .input('first_name', first_name)
      .input('last_name', last_name)
      .input('date_of_birth', date_of_birth)
      .input('username', username)
      .input('email', email)
      .input('password', Buffer.from(hashedPassword, 'utf-8'))
      .input('profile_picture_url', profile_picture_url || null) // Neobavezno polje
      .query(`
        INSERT INTO [User] (first_name, last_name, date_of_birth, username, email, password, profile_picture_url)
        VALUES (@first_name, @last_name, @date_of_birth, @username, @email, @password, @profile_picture_url)
      `);

    res.status(201).json({ success: true, message: 'User registered successfully!' });
  } catch (err) {
    console.error('Error during registration:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = { register, login };
