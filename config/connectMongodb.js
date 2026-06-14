import mongoose from "mongoose";
import config from '../config.js';
import { ensureDefaultPermissions } from '../utils/permissions.js';
import logger from '../notification/services/logger.js';

const cleanupLegacyMemberIndexes = async () => {
        try {
                const collection = mongoose.connection.db.collection('teachermodels');
                const indexes = await collection.indexes();
                const legacyClassTeacherIndex = indexes.find((idx) => idx.name === 'classTeacher_1' && idx.unique);

                if (legacyClassTeacherIndex) {
                        await collection.dropIndex('classTeacher_1');
                        logger.info('Dropped legacy unique index', { index: 'teachermodels.classTeacher_1' });
                }
        } catch (error) {
                // Ignore cleanup failures to avoid blocking application startup.
                logger.warn('Index cleanup skipped', { error: error.message });
        }
};

const ConnectDB = async ()=>{
        try {
                // Set up connection event listeners
                mongoose.connection.on ('connected', ()=>{
                        console.log('[DB] MongoDB connection established');
                        logger.info('Database connected');
                });
                
                mongoose.connection.on('error', (error) => {
                        console.error('[DB ERROR] MongoDB connection error:', error);
                        logger.error('Database connection error', { error: error.message });
                });

                // Connect to MongoDB
                console.log('[DB] Attempting to connect to MongoDB...');
                logger.info('Connecting to MongoDB', { uri: config.database.mongodbUri });
                
                await mongoose.connect(config.database.mongodbUri, {
                        dbName: config.database.dbName,
                        // useNewUrlParser: true,
                        // useUnifiedTopology: true,
                });

                console.log('[DB] MongoDB connected successfully');
                logger.info('MongoDB connection successful');

                // Cleanup legacy indexes
                console.log('[DB] Running index cleanup...');
                await cleanupLegacyMemberIndexes();

                // Ensure default permissions
                console.log('[DB] Ensuring default permissions...');
                await ensureDefaultPermissions();
                
                console.log('[DB] Database initialization complete');
                logger.info('Database initialization complete');
        } catch (error) {
                console.error('[FATAL] Failed to connect to database:', error);
                logger.error('Database connection failed', { 
                        error: error.message, 
                        stack: error.stack,
                        mongoUri: config.database.mongodbUri 
                });
                throw error; // Re-throw to be caught by server.js
        }
};
export default ConnectDB