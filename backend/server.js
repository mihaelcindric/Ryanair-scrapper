const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

const authRoutes = require('./routes/auth.routes');
const flightRoutes = require('./routes/flights.routes');
const adminRoutes = require('./routes/admin.routes');

app.use('/api/auth', authRoutes);
app.use('/api/flights', flightRoutes);
app.use('/api/admin', adminRoutes);

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
