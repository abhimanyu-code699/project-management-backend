const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();
require('./config/db');

const app = express();

app.use(cors());

app.use('/',async(req,res)=>{
    res.send('Hii From backend');
})

const PORT = process.env.PORT;
app.listen(PORT,()=>{
    console.log(`Server is running at port ${PORT}`);
})