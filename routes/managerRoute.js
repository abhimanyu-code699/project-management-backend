const express = require('express');
const { 
    addProject, 
    getTotalManagers, 
    getTotalProjects, 
    getManagersData, 
    editManager, 
    deleteManager, 
    getAllProjects, 
    createTask, 
    viewTasks
} = require('../controllers/managerController');
const { verifyToken } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/add-project',verifyToken,addProject);
router.get('/total-managers',verifyToken,getTotalManagers);
router.get('/total-projects',verifyToken,getTotalProjects);
router.get('/getManager-data',verifyToken,getManagersData);
router.put('/edit-manager/:managerId',verifyToken,editManager);
router.delete('/delete-manager/:managerId',verifyToken,deleteManager);
router.get('/get-all-projects',verifyToken,getAllProjects);
router.post('/create-task',verifyToken,createTask);
router.get('/view-tasks',verifyToken,viewTasks);


module.exports = router;