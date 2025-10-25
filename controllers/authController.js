const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const sendEmail = require('../services/nodemailer');


exports.register = async(req,res) =>{
    let connection;
    try {
        const { name,email,phone,password,role } = req.body;
        if(!name || !phone || !email || !password || !role){
            return res.status(404).json({
                message:'All fields are required to create account'
            })
        };
        //checking is account already exists or not
        connection = await pool.getConnection();

        const [row] = await connection.query(
            "SELECT email FROM users WHERE email = ?",
            [email]
        )
        if(row.length !=0){
            return res.status(400).json({
                message:'Account already exists with this email'
            });
        }
        //if account not exists then first hash the password then store on database
        const hashedPassword = await bcrypt.hash(password,7);

        const emailData = {
            role: `${role}`,
            email: email,
            password: plainPassword, 
        }
        const templatePath = path.join(__dirname, "../mail/credential-template.ejs")
        //send email to the user(password)
        await sendEmail(
            email,
            "Your Account Credentials", 
            templatePath, 
            emailData 
        )
        res.status(201).json({ message: "Account created successfully" })
    } catch (error) {
        console.log(error);
        return res.status(500).json(error.message);
    }finally{
        if(connection) connection.release();
    }
}