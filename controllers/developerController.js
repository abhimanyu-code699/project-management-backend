const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { sendMail } = require('../services/nodemailer');

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

exports.totalTasksStatus = async (req, res) => {
  const { id } = req.user;
  let connection;

  try {
    connection = await pool.getConnection();

    const [rows] = await connection.query(
      `
      SELECT 
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS totalCompleted,
        SUM(CASE WHEN t.status = 'in-progress' THEN 1 ELSE 0 END) AS totalInProgress,
        SUM(CASE WHEN t.status = 'to-do' THEN 1 ELSE 0 END) AS totalTodo
      FROM project_tasks pt
      INNER JOIN tasks t ON pt.task_id = t.id
      WHERE pt.developer_id = ?;
      `,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: {
        totalCompleted: rows[0].totalCompleted || 0,
        totalInProgress: rows[0].totalInProgress || 0,
        totalTodo: rows[0].totalTodo || 0,
      },
    });

  } catch (error) {
    console.error("Error fetching task status counts:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });

  } finally {
    if (connection) connection.release();
  }
};

exports.completedTasks = async (req, res) => {
  const { id } = req.user;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const offset = (page - 1) * limit;

  let connection;
  try {
    connection = await pool.getConnection();

    // Count total completed tasks
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM project_tasks pt
      JOIN tasks t ON pt.task_id = t.id
      WHERE pt.developer_id = ? AND t.status = 'done';
    `;
    const [countRows] = await connection.query(countQuery, [id]);
    const totalTasks = countRows[0].total;
    const totalPages = Math.ceil(totalTasks / limit);

    // Fetch paginated tasks
    const query = `
      SELECT 
          t.id AS task_id,
          t.task AS title,
          t.comment,
          t.status,
          p.project_name,
          p.id AS project_id,
          u.name AS assigned_by_name
      FROM project_tasks pt
      JOIN tasks t ON pt.task_id = t.id
      JOIN projects p ON pt.project_id = p.id
      JOIN users u ON t.assigned_by = u.id
      WHERE pt.developer_id = ? AND t.status = 'done'
      ORDER BY t.updated_at DESC
      LIMIT ? OFFSET ?;
    `;
    const [rows] = await connection.query(query, [id, limit, offset]);

    return res.status(200).json({
      success: true,
      message: "Completed tasks fetched successfully",
      data: rows,
      page,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching completed tasks:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching completed tasks",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};

exports.activeTasks = async (req, res) => {
  const { id } = req.user;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const offset = (page - 1) * limit;

  let connection;
  try {
    connection = await pool.getConnection();

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM project_tasks pt
      JOIN tasks t ON pt.task_id = t.id
      WHERE pt.developer_id = ? AND t.status = 'in-progress';
    `;
    const [countRows] = await connection.query(countQuery, [id]);
    const totalTasks = countRows[0].total;
    const totalPages = Math.ceil(totalTasks / limit);

    const query = `
      SELECT 
          t.id AS task_id,
          t.task AS title,
          t.comment,
          t.status,
          p.project_name,
          p.id AS project_id,
          u.name AS assigned_by_name
      FROM project_tasks pt
      JOIN tasks t ON pt.task_id = t.id
      JOIN projects p ON pt.project_id = p.id
      JOIN users u ON t.assigned_by = u.id
      WHERE pt.developer_id = ? AND t.status = 'in-progress'
      ORDER BY t.updated_at DESC
      LIMIT ? OFFSET ?;
    `;
    const [rows] = await connection.query(query, [id, limit, offset]);

    return res.status(200).json({
      success: true,
      message: "Active tasks fetched successfully",
      data: rows,
      page,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching active tasks:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching active tasks",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};

exports.newTasks = async (req, res) => {
  const { id } = req.user; 
  const page = parseInt(req.query.page) || 1;   
  const limit = parseInt(req.query.limit) || 5; 
  const offset = (page - 1) * limit;

  let connection;

  try {
    connection = await pool.getConnection();

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM project_tasks pt
      JOIN tasks t ON pt.task_id = t.id
      WHERE pt.developer_id = ? AND t.status = 'to-do';
    `;
    const [countRows] = await connection.query(countQuery, [id]);
    const totalTasks = countRows[0].total;
    const totalPages = Math.ceil(totalTasks / limit);

    // 2. Get paginated tasks
    const query = `
      SELECT 
          t.id AS task_id,
          t.task AS title,
          t.comment,
          t.status,
          p.project_name,
          p.id AS project_id,
          u.name AS assigned_by_name
      FROM project_tasks pt
      JOIN tasks t ON pt.task_id = t.id
      JOIN projects p ON pt.project_id = p.id
      JOIN users u ON t.assigned_by = u.id
      WHERE 
          pt.developer_id = ?
          AND t.status = 'to-do'
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?;
    `;

    const [rows] = await connection.query(query, [id, limit, offset]);

    return res.status(200).json({
      success: true,
      message: "New tasks fetched successfully",
      data: rows,
      page,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching new tasks:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching new tasks",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};

exports.updateTaskStatus = async (req, res) => {
  const { id } = req.user; // developer id
  const { taskId } = req.params; // task id from route
  const { status } = req.body; // new status

  let connection;
  try {
    connection = await pool.getConnection();

    // Validate status
    const validStatuses = ["to-do", "in-progress", "done"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    // Begin transaction
    await connection.beginTransaction();

    // 1️⃣ Update status in tasks table
    const updateTasksQuery = `
      UPDATE tasks
      SET status = ?
      WHERE id = ?;
    `;
    const [tasksResult] = await connection.query(updateTasksQuery, [status, taskId]);

    // 2️⃣ Update status in project_tasks table
    const updateProjectTasksQuery = `
      UPDATE project_tasks
      SET status = ?
      WHERE task_id = ? AND developer_id = ?;
    `;
    const [projectTasksResult] = await connection.query(updateProjectTasksQuery, [status, taskId, id]);

    // Commit transaction
    await connection.commit();

    if (tasksResult.affectedRows === 0 || projectTasksResult.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found or not assigned to you",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Task status updated successfully in both tables",
    });

  } catch (error) {
    // Rollback in case of error
    if (connection) await connection.rollback();
    console.error("Error updating task status:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating task status",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};

exports.addComment = async (req, res) => {
  const { id } = req.user; 
  const { taskId } = req.params;
  const { comment } = req.body;

  if (!comment || comment.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Comment cannot be empty",
    });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    const query = `
      UPDATE tasks
      SET comment = ?
      WHERE id = ?;
    `;
    const [result] = await connection.query(query, [comment, taskId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Comment added successfully",
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while adding comment",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};

exports.editDeveloper = async (req, res) => {
  let connection;
  const { role } = req.user; 
  const { developerId } = req.params; 
  const { name, email, phone, password } = req.body;

  try {

    if (role !== "admin") {
      return res.status(403).json({ message: "Permission denied. Only admin can edit developer details." });
    }

    if (!developerId) {
      return res.status(400).json({ message: "Developer ID is required" });
    }

    connection = await pool.getConnection();

    const [existing] = await connection.query(
      "SELECT * FROM users WHERE id = ? AND role = 'developer'",
      [developerId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: "Developer not found or role mismatch" });
    }

    const fields = [];
    const values = [];

    if (name) {
      fields.push("name = ?");
      values.push(name);
    }
    if (email) {
      fields.push("email = ?");
      values.push(email);
    }
    if (phone) {
      fields.push("phone = ?");
      values.push(phone);
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 7);
      fields.push("password = ?");
      values.push(hashedPassword);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: "No fields provided for update" });
    }

    values.push(developerId);
    const updateQuery = `UPDATE users SET ${fields.join(", ")} WHERE id = ? AND role = 'developer'`;
    const [result] = await connection.query(updateQuery, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Developer not found or update failed" });
    }

    const [updated] = await connection.query(
      "SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?",
      [developerId]
    );

    const developer = updated[0];

    if (password || email) {
      const emailData = {
        role: developer.role,
        email: developer.email,
        password: password ? password : "Your old password remains unchanged",
      };
      await sendMail(
        developer.email,
        "Your Account Credentials Updated",
        "credential-template",
        emailData
      );
    }

    res.status(200).json({
      success: true,
      message: "Developer updated successfully",
      developer,
    });
  } catch (error) {
    console.error("Error editing developer:", error);
    res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};

exports.deleteDeveloper = async (req, res) => {
  let connection;
  const { role } = req.user; 
  const { developerId } = req.params;

  try {
    if (!developerId) {
      return res.status(400).json({ message: "Developer ID is required" });
    }

    if (role !== "admin") {
      return res.status(403).json({ message: "Permission denied" });
    }

    connection = await pool.getConnection();

    const [developerRows] = await connection.query(
      "SELECT * FROM users WHERE id = ? AND role = 'developer'",
      [developerId]
    );

    if (developerRows.length === 0) {
      return res.status(404).json({ message: "Developer not found or role mismatch" });
    }

    const [projectAssignments] = await connection.query(
      "SELECT COUNT(*) AS totalProjects FROM project_developers WHERE developer_id = ?",
      [developerId]
    );

    if (projectAssignments[0].totalProjects > 0) {
      return res.status(409).json({
        message: "Cannot delete developer: assigned to active projects",
      });
    }

    const [taskAssignments] = await connection.query(
      "SELECT COUNT(*) AS totalTasks FROM project_tasks WHERE developer_id = ?",
      [developerId]
    );

    if (taskAssignments[0].totalTasks > 0) {
      return res.status(409).json({
        message: "Cannot delete developer: assigned to active project tasks",
      });
    }

    await connection.query(
      "DELETE FROM users WHERE id = ? AND role = 'developer'",
      [developerId]
    );

    res.status(200).json({
      success: true,
      message: "Developer deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete developer error:", error);
    res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};

