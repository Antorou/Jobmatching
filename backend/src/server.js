require('dotenv').config();

const app = require('./app');
const connectDB = require('./db/connection');

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

connectDB(MONGO_URI);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Connected to MongoDB at ${MONGO_URI.split('@')[1].split('/')[0]}`);
});