import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import budgetRoutes from './routes/budgets.js';
import dashboardRoutes from './routes/dashboard.js';
import aiRoutes from "./routes/aiRoutes.js";
import reviewRoutes from './routes/reviews.js';
import publicRoutes from './routes/public.js';
import billRoutes from './routes/bills.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
console.log("MONGO URI:", process.env.MONGODB_URI);
app.use(cors());
app.use(express.json());


app.use("/api/ai", aiRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/bills', billRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Finance API is running' });
});

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/finance')
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch((err) => console.error('❌ MongoDB connection error:', err));

const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is in use. Trying another port...`);
        server.listen(0);
    } else {
        console.error('❌ Server error:', err);
    }
});

server.on('listening', () => {
    const address = server.address();
    console.log(`✅ Listening on port ${typeof address === 'string' ? address : address.port}`);
});