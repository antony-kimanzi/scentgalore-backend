import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';

dotenv.config();

const app =  express();

// MIDDLEWARE //
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

const port = process.env.PORT || 3001;

app.listen(port, () => console.log(`Server is running in port ${port}`))