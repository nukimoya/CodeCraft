const express = require('express');
const { profile,
    update,
    join,
    classrooms,
    enrolled,
    sections,
    slides,
    pastQuestions,
    announcements,
    availableClassrooms,
    get_leaderboard,
    test,
    submit_test,
    xp_update,
    xp_get,
    slides_progress
 } = require('../controllers/learnerController.js');
const authorizeRole = require('../middleware/authorizeRole.js');
const auth = require('../middleware/auth.js');


const router = express.Router();

//profile
router.get("/:userId/profile", auth, profile);
router.put("/:userId/profile/update", auth, authorizeRole("Learner, Admin"), update);

//classrooms
router.get('/classrooms/available', auth, authorizeRole('Learner'), availableClassrooms)
router.post('/classrooms/:classroomId/join', auth, authorizeRole('Learner'), join)
router.get('/classrooms', auth, authorizeRole('Learner'), classrooms)
router.get('/classrooms/:classroomId', auth, authorizeRole('Learner'), enrolled);
router.get('/classrooms/:classroomId/sections', auth, authorizeRole('Learner'), sections)
router.get('/classrooms/:classroomId/sections/:sectionId/slides', auth, authorizeRole('Learner'), slides)
router.get('/classrooms/:classroomId/sections/:sectionId/past-questions', auth, authorizeRole('Learner'), pastQuestions)
router.get('/classrooms/:classroomId/announcements', auth, authorizeRole('Learner'), announcements)  

//leaderboard
router.get('/classrooms/:classroomId/leaderboard', auth, authorizeRole('Learner'), get_leaderboard)


//questions
router.get('/classrooms/:classroomId/sections/:sectionId/slides/:slideId/test', auth,  authorizeRole('Learner'), test)
router.post('/classrooms/:classroomId/sections/:sectionId/slides/:slideId/submit-test',auth, authorizeRole('Learner'), submit_test)

//xp
router.post('/:userId/xp', auth, xp_update) 
router.get('/:userId/xp', auth, xp_get)

//progress
router.get('/classrooms/:classroomId/sections/:sectionId/slides/:slideId/slides-progress', auth, authorizeRole('Learner'), slides_progress)

module.exports = router;