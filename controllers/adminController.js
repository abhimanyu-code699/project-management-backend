const pool = require('../config/db');
const bcrypt = require('bcryptjs');

exports.addAdmin = async(req,res) =>{
    let connection
    try {
        const { name,email,password,phone,role } = req.body;
        if(!name || !email || !password || !phone || !role){
            return res.status(400).json({
                message:'All fields are required to add-admin'
            });
        }
        connection = await pool.getConnection();

        const [row] = await connection.query(
            "SELECT email FROM users WHERE email = ?",
            [email]
        )
        if(row.length != 0){
            return res.status(400).json({
                message:'Admin already exists with this email'
            });
        }
        const hashedPassword = await bcrypt.hash(password,7);

        await connection.query(
            "INSERT INTO users (name,email,phone,password,role) VALUES(?,?,?,?,?)",
            [name,email,hashedPassword,phone,role]
        )

        return res.status(200).json({
            message:'admin account created successfully'
        });
    } catch (error) {
        console.log(error.message);
        return res.status(500).json(error.message);
    }finally{
        if(connection) connection.release();
    }
}