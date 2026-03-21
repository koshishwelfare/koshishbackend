import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import config from './config.js';
import ConnectCloudinary from './config/cloudinary.js';
import ConnectDB from './config/connectMongodb.js';
import coCirculerRoutes from './routes/coCirculerRoutes.js';
import coordinaterRoutes from './routes/coordinaterRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import userRoutes from './routes/userRoutes.js';
import appRoutes from './routes/appRoutes.js';
// app config
const app = express();

const normalizeCorsOrigin = (originConfig) => {
    if (originConfig === true || originConfig === false) return originConfig;
    if (typeof originConfig !== 'string') return true;

    const value = originConfig.trim();
    if (!value) return true;

    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    if (value.includes(',')) {
        return value
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean);
    }

    return value;
};

ConnectDB()
ConnectCloudinary()
const port = config.server.port
const corsOrigin = normalizeCorsOrigin(config.cors.origin);

//  middleware
app.use(cors({
    origin: corsOrigin,
    credentials: Boolean(config.cors.credentials)
}));
app.use(cookieParser());
// Parse JSON bodies (API requests)
app.use(express.json());
// Parse URL-encoded bodies (HTML forms)
app.use(express.urlencoded({ extended: true }));
//  APIs endpoints
app.use('/api/app',appRoutes);
app.use('/api/user',userRoutes);
app.use('/api/teacher',teacherRoutes)
app.use('/api/cocirculer',coCirculerRoutes)
app.use('/api/coordinater',coordinaterRoutes)
// app.use('/api/upload/coordinater',coordinaterRoutes)
app.get('/' ,   (req,res)=>{
    res.send('Api is working')
});
app.listen (port, ()=>console.log("server is started",port));
