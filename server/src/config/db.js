import mongoose from 'mongoose';

/**
 * Connect to MongoDB (Atlas). The database name is kept out of the URI
 * and set explicitly so the same URI works across environments.
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is missing from the environment.');

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB_NAME || 'mystery_room',
    serverSelectionTimeoutMS: 10_000,
  });

  console.log(`🗄️  MongoDB connected → db "${mongoose.connection.db.databaseName}"`);
  return mongoose.connection;
}
