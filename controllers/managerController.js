const pool = require('../config/db');

exports.addProject = async (req, res) => {
    const { role, email } = req.user;
    console.log("Role:",role);
    let connection;

    try {
        if (role !== 'manager') {
            return res.status(403).json({
                message: 'You do not have permission to create a project',
            });
        }

        const { project_name, assigned_to, task, completion_date } = req.body;

        if (!project_name || !assigned_to || !task || !completion_date) {
            return res.status(400).json({
                message: 'All fields (project_name, assigned_to, task, completion_date) are required',
            });
        }

        connection = await pool.getConnection();

        // Find manager ID
        const [result] = await connection.query(
            "SELECT id FROM users WHERE email = ? AND role = ?",
            [email, role]
        );

        if (result.length === 0) {
            return res.status(404).json({ message: 'Manager not found' });
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
            message: 'Project created successfully',
            projectId,
            taskId,
        });

    } catch (error) {
        console.error('Error creating project:', error);
        return res.status(500).json({ message: error.message });
    } finally {
        if (connection) connection.release();
    }
};

exports.getTotalManagers = async(req,res) =>{
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
            "SELECT COUNT(id) AS totalManagers FROM users WHERE role = ?",
            ['manager']
        )
        return res.status(200).json({
            success:true,
            totalManagers:result[0].totalManagers
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json(error);
    }finally{
        if(connection) connection.release();
    }
}

exports.getTotalProjects = async(req,res) =>{
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
            "SELECT COUNT(id) AS totalProjects FROM projects"
        )
        return res.status(200).json({
            success:true,
            totalProjects:result[0].totalProjects
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json(error);
    }finally{
        if(connection)connection.release();
    }
}