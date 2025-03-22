const express = require('express');
const authorizeRole = require('../middleware/authorizeRole.js');
const auth = require('../middleware/auth.js');
const { profile,
    update,
    section_create,
    get_classrooms,
    classroom_details,
    section_list,
    slide_upload,
    slide_section,
    specific_section_details,
    past_question_upload,
    create_announcements,
    update_leaderboard,
    get_students,
    get_past_question,
    get_announcements,
    delete_classroom,
    delete_course_section,
    delete_slide,
    delete_past_question,
    create_classroom,
    classroom_stats,
    get_questions,
    generate_questions,
    update_questions,
    delete_questions,
    delete_announcement
} = require('../controllers/adminController.js');
const { upload, handleMulterErrors } = require('../middleware/upload');

const router = express.Router();

//profile
router.get("/profile", auth, authorizeRole("Admin"), profile);
router.put("/profile/update", auth, authorizeRole("Admin"), update);

//classrooms
router.post('/classrooms/:classroomId/course-sections/create', auth, authorizeRole('Admin'), section_create)
router.get('/classrooms-stats', auth, authorizeRole('Admin'), classroom_stats)
router.get('/classrooms', auth, authorizeRole('Admin'), get_classrooms)
router.get('/classrooms/:classroomId', auth, authorizeRole('Admin'), classroom_details)
router.get('/classrooms/:classroomId/course-sections', auth, authorizeRole('Admin'), section_list)
router.post('/classrooms/:classroomId/course-sections/:courseSectionId/slides/upload', auth, authorizeRole('Admin'), upload.single('file'), handleMulterErrors, slide_upload)
router.get('/classrooms/:classroomId/course-sections/:courseSectionId/slides', auth, authorizeRole('Admin'), slide_section)
router.get('/classrooms/:classroomId/course-sections/:courseSectionId', auth, authorizeRole('Admin'), specific_section_details)
router.post('/classrooms/:classroomId/course-sections/:courseSectionId/past-questions/upload', auth, authorizeRole('Admin'), upload.array('files', 5), handleMulterErrors, past_question_upload)
router.post('/classrooms/:classroomId/announcements', auth, authorizeRole('Admin'), upload.array('files', 5), create_announcements)
router.get('/classrooms/:classroomId/leaderboard', auth, authorizeRole('Admin'), update_leaderboard)
router.get('/classrooms/:classroomId/students', auth, authorizeRole('Admin'), get_students)
router.get('/classrooms/:classroomId/course-sections/:courseSectionId/past-questions', auth, authorizeRole('Admin'), get_past_question)
router.get('/classrooms/:classroomId/announcements', auth, authorizeRole('Admin'), get_announcements)

//delete
router.delete('/classrooms/:classroomId', auth, authorizeRole('Admin'), delete_classroom)
router.delete('/classrooms/:classroomId/course-sections/:sectionId', auth, authorizeRole('Admin'), delete_course_section)
router.delete('/classrooms/:classroomId/course-sections/:sectionId/slides/:slideId', auth, authorizeRole('Admin'), delete_slide)
router.delete('/classrooms/:classroomId/course-sections/:sectionId/past-questions/:questionId', auth, authorizeRole('Admin'), delete_past_question)  
router.delete('/classrooms/:classroomId/announcements/:announcementId', auth, authorizeRole('Admin'), delete_announcement)


//questions
router.get('/classrooms/:classroomId/course-sections/:sectionId/slides/:slideId/questions', auth, authorizeRole('Admin'), get_questions)
router.post('/classrooms/:classroomId/course-sections/:sectionId/slides/:slideId/generate-questions', auth, authorizeRole('Admin'), generate_questions)
router.put('/classrooms/:classroomId/course-sections/:sectionId/slides/:slideId/questions/:questionId', auth, authorizeRole('Admin'), update_questions)
router.delete('/classrooms/:classroomId/course-sections/:sectionId/slides/:slideId/questions/:questionId', auth, authorizeRole('Admin'), delete_questions)

//create
router.post('/classrooms/create', auth, authorizeRole('Admin'), create_classroom)

module.exports = router;