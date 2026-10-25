import 'dotenv/config';
import { connectDB } from '../src/config/db.js';
import mongoose from 'mongoose';

try {
  await connectDB();
  await mongoose.connection.db.admin().ping();
  console.log('✓ MongoDB ping OK — Atlas URI works.');
} catch (err) {
  console.error('✗ MongoDB connection failed:', err.message);
  process.exitCode = 1;
} finally {
  await mongoose.connection.close().catch(() => {});
}
