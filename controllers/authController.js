const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const {sendMail} = require('../services/nodemailer');
const jwt = require('jsonwebtoken');
const path = require('path');

exports.register = async(req,res) =>{
    let connection;

    const {role} = req.user;
    console.log("Role",role);
    const roleId = role;
    try {
        const { name,email,phone,password,role } = req.body;
        if(!name || !phone || !email || !password || !role){
            return res.status(404).json({
                message:'All fields are required to create account'
            })
        };
        if(roleId != 'admin'){
            return res.status(409).json({
                message:'permission denied'
            })
        }
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
            password 
        }
        
        //send email to the user(password)
        await sendMail(
            email,
            "Your Account Credentials", 
            "credential-template", 
            emailData 
        )

        await connection.query(
            "INSERT INTO users (name,email,password,phone,role) VALUES(?,?,?,?,?)",
            [name,email,hashedPassword,phone,role]
        )
        res.status(201).json({ message: "Account created successfully" })
    } catch (error) {
        console.log(error);
        return res.status(500).json(error.message);
    }finally{
        if(connection) connection.release();
    }
}

exports.login = async(req,res) =>{
    let connection
    try {
        const { email,password } = req.body;
        if(!email || !password){
            return res.status(404).json({
                message:'Email and password are requried to login'
            });
        }
        connection = await pool.getConnection();

        const [row] = await connection.query(
            "SELECT id,email,name,password,role FROM users WHERE email = ?",
            [email]
        )
        if(row.length === 0){
            return res.status(404).json({
                message:'No user found with this email'
            })
        }
        const user = row[0];
        //now matching the password
        const passwordMatch = await bcrypt.compare(password,user.password);

        if(!passwordMatch){
            return res.status(400).json({
                message:'Password is wrong'
            })
        }
        //create jwt token
        const token = jwt.sign(
            {
                id:user.id,
                name:user.name,
                email:user.email,
                role:user.role
            },
            process.env.JWT_SECRET,
            {expiresIn: "24h"}
        );

        return res.status(200).json({
            message:'Login successfully',
            token,
            user:{
                id:user.id,
                email:user.email,
                role:user.role,
                name:user.name
            }
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json(error.message);
    }finally{
        if(connection) connection.release();
    }
}