import express from 'express';
import cors from 'cors';
import prisma from './prisma/prismaClient.js'; 
import './jobs/lowStockJob.js'; 
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import stockHistoryRoutes from './routes/stockHistoryRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import orderItemRoutes from './routes/orderItemRoutes.js';

const app = express();

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
  res.send('StoreTrack API is running');
});

// Routes
app.use('/products', productRoutes);
app.use('/categories', categoryRoutes);
app.use('/stockHistory', stockHistoryRoutes);
app.use('/orders', orderRoutes);
app.use('/order-items', orderItemRoutes);

export default app;
