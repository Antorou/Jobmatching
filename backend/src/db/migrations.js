const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

const runMigrations = async () => {
  try {
    if (!MONGO_URI) {
      console.error("MONGO_URI is not defined in environment variables. Cannot run migrations.");
      process.exit(1);
    }

    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Migrations: MongoDB connected.');

    await mongoose.connection.collection('resumes').createIndex({ userId: 1 }, { unique: true })
      .then(() => console.log('Index on resumes.userId created (or already exists).'))
      .catch(err => console.error('Error creating index on resumes.userId:', err));

    await mongoose.connection.collection('resumes').createIndex({ fileName: 1 })
      .then(() => console.log('Index on resumes.fileName created (or already exists).'))
      .catch(err => console.error('Error creating index on resumes.fileName:', err));

    await mongoose.connection.collection('joboffers').createIndex({ fileName: 1 }, { unique: true })
      .then(() => console.log('Index on joboffers.fileName created (or already exists).'))
      .catch(err => console.error('Error creating index on joboffers.fileName:', err));

    await mongoose.connection.collection('scores').createIndex({ resumeId: 1, jobOfferId: 1 }, { unique: true })
      .then(() => console.log('Index on scores.resumeId,jobOfferId created (or already exists).'))
      .catch(err => console.error('Error creating index on scores.resumeId,jobOfferId:', err));

    console.log('Migrations: All operations completed.');

  } catch (err) {
    console.error('Migrations: Error during migration process:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Migrations: MongoDB disconnected.');
  }
};

runMigrations();