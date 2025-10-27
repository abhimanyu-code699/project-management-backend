const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const { sendMail } = require("../services/nodemailer");

exports.addProject = async (req, res) => {
  const { role, email } = req.user;
  console.log("Role:", role);
  let connection;

  try {
    if (role !== "manager") {
      return res.status(403).json({
        message: "You do not have permission to create a project",
      });
    }

    const { project_name, assigned_to, task, completion_date } = req.body;

    if (!project_name || !assigned_to || !task || !completion_date) {
      return res.status(400).json({
        message:
          "All fields (project_name, assigned_to, task, completion_date) are required",
      });
    }

    connection = await pool.getConnection();

    // Find manager ID
    const [result] = await connection.query(
      "SELECT id FROM users WHERE email = ? AND role = ?",
      [email, role]
    );

    if (result.length === 0) {
      return res.status(404).json({ message: "Manager not found" });
    }

    const managerId = result[0].id;

    // Insert into projects
    const [projectRes] = await connection.query(
      "INSERT INTO projects (project_name, manager_id, completion_date) VALUES (?, ?, ?)",
      [project_name, managerId, completion_date]
    );

    const projectId = projectRes.insertId;

    // Insert into tasks
    const [taskRes] = await connection.query(
      "INSERT INTO tasks (task, assigned_by) VALUES (?, ?)",
      [task, managerId]
    );

    const taskId = taskRes.insertId;

    // Insert into project_developers
    await connection.query(
      "INSERT INTO project_developers (project_id, developer_id) VALUES (?, ?)",
      [projectId, assigned_to]
    );

    // Insert into project_tasks
    await connection.query(
      "INSERT INTO project_tasks (project_id, task_id, developer_id, tasks) VALUES (?, ?, ?, ?)",
      [projectId, taskId, assigned_to, task]
    );

    return res.status(200).json({
      message: "Project created successfully",
      projectId,
      taskId,
    });
  } catch (error) {
    console.error("Error creating project:", error);
    return res.status(500).json({ message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.getTotalManagers = async (req, res) => {
  const { role } = req.user;
  let connection;
  try {
    if (role != "admin") {
      return res.status(409).json({
        message: "Permission denied",
      });
    }
    connection = await pool.getConnection();

    const [result] = await connection.query(
      "SELECT COUNT(id) AS totalManagers FROM users WHERE role = ?",
      ["manager"]
    );
    return res.status(200).json({
      success: true,
      totalManagers: result[0].totalManagers,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  } finally {
    if (connection) connection.release();
  }
};

exports.getTotalProjects = async (req, res) => {
  const { role } = req.user;
  let connection;
  try {
    if (role != "admin") {
      return res.status(409).json({
        message: "Permission denied",
      });
    }
    connection = await pool.getConnection();

    const [result] = await connection.query(
      "SELECT COUNT(id) AS totalProjects FROM projects"
    );
    return res.status(200).json({
      success: true,
      totalProjects: result[0].totalProjects,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  } finally {
    if (connection) connection.release();
  }
};

exports.getManagersData = async (req, res) => {
  let connection;
  const { role } = req.user;

  try {
    if (role !== "admin") {
      return res.status(403).json({ message: "Permission denied" });
    }

    connection = await pool.getConnection();

    const [managers] = await connection.query(
      `
      SELECT 
          u.id,
          u.name,
          u.email,
          u.phone,
          COALESCE(COUNT(p.id), 0) AS total_projects
      FROM users u
      LEFT JOIN projects p 
          ON u.id = p.manager_id
      WHERE u.role = ?
      GROUP BY u.id, u.name, u.email, u.phone
      ORDER BY u.id ASC;
      `,
      ["manager"]
    );

    res.status(200).json({
      success: true,
      data: managers,
    });
  } catch (error) {
    console.error("Error fetching managers:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};

exports.editManager = async (req, res) => {
  let connection;
  const { role } = req.user; 
  const { managerId } = req.params;
  const { name, email, phone, password } = req.body;

  try {
    if (!managerId) {
      return res.status(400).json({ message: "Manager ID is required" });
    }
    if (role !== "admin") {
      return res.status(403).json({ message: "Permission denied" });
    }
    connection = await pool.getConnection();

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
      return res.status(400).json({ message: "No fields to update" });
    }

    values.push(managerId);

    const sql = `UPDATE users SET ${fields.join(
      ", "
    )} WHERE id = ? AND role = 'manager'`;
    const [result] = await connection.query(sql, values);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Manager not found or role mismatch" });
    }

    const [updated] = await connection.query(
      "SELECT id, name, email, phone, role FROM users WHERE id = ?",
      [managerId]
    );
    const manager = updated[0];

    if (password || email) {
      const emailData = {
        role: manager.role,
        email: manager.email,
        password: password ? password : "Your Old Password",
      };
      await sendMail(
        email,
        "Your Account Credentials",
        "credential-template",
        emailData
      );
    }
    res.status(200).json({
      success: true,
      message: "Manager updated successfully",
      manager,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.deleteManager = async (req, res) => {
    let connection;
    const { role } = req.user; 
    const { managerId } = req.params;

    try {
        if (!managerId) {
            return res.status(400).json({ message: 'Manager ID is required' });
        }
        if (role !== 'admin') {
            return res.status(403).json({ message: 'Permission denied' });
        }
        connection = await pool.getConnection();

        const [managerRows] = await connection.query(
            "SELECT * FROM users WHERE id = ? AND role = 'manager'",
            [managerId]
        );

        if (managerRows.length === 0) {
            return res.status(404).json({ message: 'Manager not found' });
        }

        const [projectCountRows] = await connection.query(
            "SELECT COUNT(*) AS totalProjects FROM projects WHERE manager_id = ?",
            [managerId]
        );

        if (projectCountRows[0].totalProjects > 0) {
            return res.status(409).json({
                message: 'Cannot delete manager: manager has active projects'
            });
        }

        const [taskCountRows] = await connection.query(
            "SELECT COUNT(*) AS totalTasks FROM tasks WHERE assigned_by = ?",
            [managerId]
        );

        if (taskCountRows[0].totalTasks > 0) {
            return res.status(409).json({
                message: 'Cannot delete manager: manager has assigned tasks'
            });
        }

        await connection.query(
            "DELETE FROM users WHERE id = ? AND role = 'manager'",
            [managerId]
        );

        res.status(200).json({
            success: true,
            message: 'Manager deleted successfully'
        });
    } catch (error) {
        console.error('❌ Delete manager error:', error);
        res.status(500).json({ message: 'Something went wrong', error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

exports.getAllProjects = async (req, res) => {
  const { id, role } = req.user;
  let connection;

  try {
    if (role != "manager") {
      return res.status(403).json({
        message: "Permission denied: only managers can access this data.",
      });
    }

    connection = await pool.getConnection();

    // Query: fetch projects created by this manager + assigned developers
    const [rows] = await connection.query(
      `
      SELECT 
        p.id AS project_id,
        p.project_name,
        p.status,
        DATE_FORMAT(p.start_date, '%Y-%m-%d %H:%i:%s') AS start_date,
        DATE_FORMAT(p.completion_date, '%Y-%m-%d') AS completion_date,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'developer_id', u.id,
            'developer_name', u.name,
            'developer_email', u.email
          )
        ) AS assigned_developers
      FROM projects p
      LEFT JOIN project_developers pd ON p.id = pd.project_id
      LEFT JOIN users u ON pd.developer_id = u.id
      WHERE p.manager_id = ?
      GROUP BY p.id
      ORDER BY p.start_date DESC
      `,
      [id]
    );

    return res.status(200).json({
      message: "Projects fetched successfully",
      projects: rows,
    });
  } catch (error) {
    console.error("❌ Error fetching manager projects:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};

exports.createTask = async (req, res) => {
  const { id, role } = req.user;
  const { projectId, taskName, developerId, completion_date } = req.body;

  let connection;
  try {
    if (role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Only managers can create tasks',
      });
    }

    if (!projectId || !taskName || !developerId || !completion_date) {
      return res.status(400).json({
        success: false,
        message: 'All fields (projectId, taskName, developerId, completion_date) are required',
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [row] = await connection.query(
      "SELECT email FROM users WHERE id = ?",
      [developerId]
    )
    const email = row[0].email;

    const [result] = await connection.query(
      "SELECT name FROM users WHERE id = ?",
      [id]
    )
    const managerName = result[0].name;

    const [projectDetails] = await connection.query(
      "SELECT project_name FROM projects WHERE id = ?",
      [projectId]
    )
    const projectName = projectDetails[0].project_name;

    const [taskResult] = await connection.query(
      `INSERT INTO tasks (task, assigned_by, completion_date) VALUES (?, ?, ?)`,
      [taskName, id, completion_date]
    );

    const taskId = taskResult.insertId;

    await connection.query(
      `INSERT INTO project_tasks (project_id, task_id, developer_id, tasks, status)
       VALUES (?, ?, ?, ?, 'to-do')`,
      [projectId, taskId, developerId, taskName]
    );

    await connection.commit();

    const emailData = {
      task:taskName,
      project_name:projectName,
      managerName,
      completion_date
    }
    
    await sendMail(
        email,
        "Task Assigned", 
        "task-template", 
        emailData 
    )

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: {
        taskId,
        projectId,
        developerId,
        taskName,
        completion_date,
      },
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('❌ Error creating task:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  } finally {
    if (connection) connection.release();
  }
};

exports.viewTasks = async (req, res) => {
  const { id, role } = req.user; 
  let connection;

  try {
    if (role !== "manager") {
      return res.status(403).json({
        success: false,
        message: "Only managers can view their tasks",
      });
    }

    connection = await pool.getConnection();

    const [tasks] = await connection.query(
      `
      SELECT 
          t.id AS task_id,
          t.task AS task_name,
          t.status AS task_status,
          t.completion_date,
          t.created_at AS created_at,
          p.id AS project_id,
          p.project_name,
          u.id AS developer_id,
          u.name AS developer_name,
          u.email AS developer_email
      FROM tasks t
      JOIN project_tasks pt ON t.id = pt.task_id
      JOIN projects p ON pt.project_id = p.id
      JOIN users u ON pt.developer_id = u.id
      WHERE t.assigned_by = ?
      ORDER BY t.created_at DESC
      `,
      [id]
    );

    if (tasks.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No tasks found for this manager",
        data: [],
      });
    }

    res.status(200).json({
      success: true,
      message: "Tasks fetched successfully",
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  } finally {
    if (connection) connection.release();
  }
};

