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
        mongoose.connection.on ('connected', ()=>logger.info('Database connected'));
        await mongoose.connect(config.database.mongodbUri, {
                dbName: config.database.dbName,
                useNewUrlParser: true,
      useUnifiedTopology: true,
        })
        await cleanupLegacyMemberIndexes();
        await ensureDefaultPermissions();
}
export default ConnectDB