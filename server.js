import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app = express();

// MIDDLEWARE //

app.use(express.json());
app.use(cors());

const port = process.env.PORT || 3001;

app.listen(port, () => console.log(`server started on port ${port}`));