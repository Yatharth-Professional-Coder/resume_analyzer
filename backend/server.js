require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Connect to Database
connectDB();

const aiRoutes = require('./routes/aiRoutes');

const app = express();

// Middleware
app.use((req, res, next) => {
  console.log(`${req.method} request to ${req.url}`);
  next();
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/ai', aiRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Elevate.AI API is running...');
});

const PORT = process.env.PORT || 5001;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
