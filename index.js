const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require("body-parser")
const adminRoute = require('./routes/adminRoute');
const authRoute = require('./routes/authRoute');

dotenv.config();
require('./config/db');

const app = express();

app.use(cors());
app.use(bodyParser.json())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

//apis
app.use('/admin',adminRoute);
app.use('/auth',authRoute);



app.use('/',async(req,res)=>{
    res.send('Hii From backend');
})

const PORT = process.env.PORT;
app.listen(PORT,()=>{
    console.log(`Server is running at port ${PORT}`);
})