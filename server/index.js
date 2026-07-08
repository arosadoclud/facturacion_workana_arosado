import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import clientsRouter from './routes/clients.js';
import invoicesRouter from './routes/invoices.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/clients', clientsRouter);
app.use('/api/invoices', invoicesRouter);

const PORT = process.env.PORT || 4000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Conectado a MongoDB');
    app.listen(PORT, () => console.log(`Servidor escuchando en puerto ${PORT}`));
  })
  .catch((err) => {
    console.error('Error conectando a MongoDB:', err.message);
    process.exit(1);
  });
