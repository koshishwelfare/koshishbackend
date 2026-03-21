import mongoose from 'mongoose';
import config from '../config.js';
import { Student } from '../models/student/studentSchema.js';

const run = async () => {
  try {
    await mongoose.connect(config.database.mongodbUri, {
      dbName: config.database.dbName,
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    const before = await Student.collection.indexes();
    console.log('Indexes before sync:');
    console.table(before.map((idx) => ({ name: idx.name, key: JSON.stringify(idx.key), unique: !!idx.unique })));

    const dropped = await Student.syncIndexes();
    console.log('Dropped indexes:', dropped);

    const after = await Student.collection.indexes();
    console.log('Indexes after sync:');
    console.table(after.map((idx) => ({ name: idx.name, key: JSON.stringify(idx.key), unique: !!idx.unique })));

    console.log('Student index sync completed.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to sync student indexes:', error);
    process.exit(1);
  }
};

run();
