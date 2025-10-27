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
            [name,email,phone,hashedPassword,role]
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

exports.getAllProjectsData = async (req, res) => {
  const { role } = req.user;
  let connection;

  try {
    if (role !== 'admin') {
      return res.status(405).json({
        success: false,
        message: 'This data can only be accessed by admin',
      });
    }

    connection = await pool.getConnection();

    const [projects] = await connection.query(`
      SELECT 
        p.id,
        p.project_name,
        p.status,
        p.start_date,
        p.completion_date,
        u.name AS manager_name
      FROM projects p
      INNER JOIN users u ON p.manager_id = u.id
      ORDER BY p.id DESC
    `);

    const [developers] = await connection.query(`
      SELECT 
        pd.project_id,
        u.name AS developer_name
      FROM project_developers pd
      INNER JOIN users u ON pd.developer_id = u.id
    `);

    const projectData = projects.map((project) => {
      const assignedDevelopers = developers
        .filter((dev) => dev.project_id === project.id)
        .map((dev) => dev.developer_name);

      return {
        ...project,
        developers: assignedDevelopers,
      };
    });

    return res.status(200).json({
      success: true,
      data: projectData,
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching projects',
    });
  } finally {
    if (connection) connection.release();
  }
};
