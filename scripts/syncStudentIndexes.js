import mongoose from 'mongoose';
import config from '../config.js';
import { Student } from '../models/student/studentSchema.js';
import logger from '../notification/services/logger.js';

const run = async () => {
  try {
    await mongoose.connect(config.database.mongodbUri, {
      dbName: config.database.dbName,
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    logger.info('Connected to MongoDB');

    const before = await Student.collection.indexes();
    logger.info('Indexes before sync', {
      indexes: before.map((idx) => ({ name: idx.name, key: JSON.stringify(idx.key), unique: !!idx.unique }))
    });

    const dropped = await Student.syncIndexes();
    logger.info('Dropped indexes', { dropped });

    const after = await Student.collection.indexes();
    logger.info('Indexes after sync', {
      indexes: after.map((idx) => ({ name: idx.name, key: JSON.stringify(idx.key), unique: !!idx.unique }))
    });

    logger.info('Student index sync completed');
    process.exit(0);
  } catch (error) {
    logger.error('Failed to sync student indexes', { error: error.message });
    process.exit(1);
  }
};

run();
