// require('dotenv').config();

import dotenv from 'dotenv'
import express from 'express'
import connectDB from './db/index.js';

dotenv.config()

const app = express();

connectDB();

















// ;( async () => {
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//         app.on('error', (error) => {
//             console.log(`Error occured: ${error}`,)
//         });
//         app.listen(process.env.PORT, () => {
//             console.log(`App listening to port: ${process.env.PORT}`);
//         })
//     } catch (error) {
//         console.error("Error: ", error)
//     }
// })()