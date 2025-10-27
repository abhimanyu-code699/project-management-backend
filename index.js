const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require("body-parser")
const adminRoute = require('./routes/adminRoute');
const authRoute = require('./routes/authRoute');
const developerRoute = require('./routes/developerRoute');
const managerRoute = require('./routes/managerRoute');

dotenv.config();
require('./config/db');

const app = express();

app.use(cors({
  origin:"https://project-management-frontend-dusky.vercel.app",
  methods: ["GET", "POST","PATCH","PUT"], 
  credentials:true
}))

app.use(bodyParser.json())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

//apis
app.use('/admin',adminRoute);
app.use('/auth',authRoute);
app.use('/api',developerRoute);
app.use('/api',managerRoute);


app.use('/',async(req,res)=>{
    res.json({
        message:'Hii from backend'
    });
})

const PORT = process.env.PORT;
app.listen(PORT,()=>{
    console.log(`Server is running at port ${PORT}`);
})