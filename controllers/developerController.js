const pool = require('../config/db');

exports.getDevelopersSuggestions = async (req, res) => {
  let connection;
  try {
    const { query } = req.query;

    connection = await pool.getConnection();

    if (!query || query.trim() === "") {
      return res.status(200).json([]);
    }

    const searchTerm = `%${query}%`;

    const [rows] = await connection.query(
      `SELECT id, name 
       FROM users 
       WHERE role = 'developer' 
         AND LOWER(name) LIKE LOWER(?) 
       ORDER BY name ASC 
       LIMIT 10`,  // return max 10 suggestions for performance
      [searchTerm]
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error("❌ Error fetching developer suggestions:", error);
    res.status(500).json({ message: "Internal Server Error" });
  } finally {
    if (connection) connection.release();
  }
};

exports.getTotalDevelopers = async(req,res) =>{
  const { role } = req.user;
  let connection
  try {
    if(role != 'admin'){
      return res.status(409).json({
        message:'Permission denied'
      })
    }
    connection = await pool.getConnection();

    const [result] = await connection.query(
      "SELECT COUNT(id) AS totalDevelopers FROM users WHERE role = ?",
      ['developer']
    )
    return res.status(200).json({
      success:true,
      totalDevelopers:result[0].totalDevelopers
    })
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  }finally{
    if(connection) connection.release();
  }
}

exports.developersData = async (req, res) => {
  let connection;
  const { role } = req.user;

  try {
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Permission denied' });
    }

    connection = await pool.getConnection();

    // Fetch all developers
    const [developers] = await connection.query(
      "SELECT id, name, email, phone FROM users WHERE role = 'developer'"
    );

    // For each developer, get number of projects and their tasks
    const developerDetails = await Promise.all(
      developers.map(async (dev) => {
        // Count projects
        const [projects] = await connection.query(
          "SELECT p.id, p.project_name FROM project_developers pd JOIN projects p ON pd.project_id = p.id WHERE pd.developer_id = ?",
          [dev.id]
        );

        // Fetch tasks per project
        const tasksPerProject = await Promise.all(
          projects.map(async (proj) => {
            const [tasks] = await connection.query(
              `SELECT t.id, t.task, t.status 
               FROM project_tasks pt 
               JOIN tasks t ON pt.task_id = t.id 
               WHERE pt.developer_id = ? AND pt.project_id = ?`,
              [dev.id, proj.id]
            );
            return {
              project_id: proj.id,
              project_name: proj.project_name,
              tasks,
            };
          })
        );

        return {
          ...dev,
          total_projects: projects.length,
          projects: tasksPerProject,
        };
      })
    );

    return res.status(200).json({ success: true, data: developerDetails });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Something went wrong', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

