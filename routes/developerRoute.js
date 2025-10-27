const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const { 
    getDevelopersSuggestions, 
    getTotalDevelopers, 
    developersData, 
    totalTasksStatus, 
    completedTasks, 
    activeTasks,
    newTasks,
    updateTaskStatus,
    addComment,
    editDeveloper,
    deleteDeveloper
} = require('../controllers/developerController');
const router = express.Router();

router.get('/get-developers',getDevelopersSuggestions);
router.get('/total-developers',verifyToken,getTotalDevelopers);
router.get('/getDeveloper-data',verifyToken,developersData);
router.get('/tasks-stats',verifyToken,totalTasksStatus);
router.get('/get-completed-tasks',verifyToken,completedTasks);
router.get('/get-active-tasks',verifyToken,activeTasks);
router.get('/get-new-tasks',verifyToken,newTasks);
router.put('/update-task-status/:taskId',verifyToken,updateTaskStatus);
router.post('/comment-task/:taskId',verifyToken,addComment);
router.put('/edit-developer/:developerId',verifyToken,editDeveloper);
router.delete('/delete-developer/:developerId',verifyToken,deleteDeveloper);

module.exports = router;