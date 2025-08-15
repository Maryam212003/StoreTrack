import express from 'express';
import cors from 'cors';
import prisma from './prisma/prismaClient.js'; 
import './jobs/lowStockJob.js'; 

// Routes
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import stockHistoryRoutes from './routes/stockHistoryRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import orderItemRoutes from './routes/orderItemRoutes.js';
import reportRoutes from './routes/reportRoutes.js';

const app = express();

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
  res.send('StoreTrack API is running');
});

// API Routes
app.use('/products', productRoutes);
app.use('/categories', categoryRoutes);
app.use('/stockHistory', stockHistoryRoutes);
app.use('/orders', orderRoutes);
app.use('/order-items', orderItemRoutes);
app.use('/reports', reportRoutes);

// Graceful shutdown (important for Docker)
process.on('SIGTERM', async () => {
  console.log('SIGTERM received: closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});

export default app;
