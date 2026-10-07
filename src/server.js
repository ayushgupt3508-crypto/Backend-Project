// require('dotenv').config();

import app from './app.js'
import dotenv from 'dotenv'
import connectDB from './db/index.js';

dotenv.config()

const port = process.env.PORT || 8000;

connectDB()
.then(() => {
    app.listen(port , () => {
        console.log(`Server is listening on port: ${port}`);
    })
})
.catch((err) => {
    console.log("Mongo db connection error!",err)
});

















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