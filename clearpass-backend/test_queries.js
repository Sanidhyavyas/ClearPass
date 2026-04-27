require('dotenv').config();
const db = require('./db');

async function test() {
  try {
    // Test getStudentsForSubject for subject 1 (IoT)
    const subjectId = 1;
    const { rows: students } = await db.query(
      `SELECT
         u.id            AS student_id,
         u.name          AS student_name,
         u.email,
         u.roll_number,
         sa.id           AS approval_id,
         sa.status       AS subject_approval_status
       FROM users u
       JOIN term_grant_certificates tgc ON tgc.student_id = u.id
       LEFT JOIN subject_approvals sa
         ON sa.certificate_id = tgc.id AND sa.subject_id = $1
       WHERE u.role = 'student'
       ORDER BY u.roll_number NULLS LAST, u.name`,
      [subjectId]
    );
    console.log('Students for subject 1:', students);

    // Test COUNT query for getRequests (the buggy one vs fixed)
    const where = "WHERE u.role = 'student'";
    const r2 = await db.query(
      `SELECT COUNT(*) AS total FROM clearance_requests cr LEFT JOIN users u ON u.id = cr.student_id ${where}`,
      []
    );
    console.log('Fixed count query result:', r2.rows[0]);

    // Check /api/certificate/my-subjects route - what it returns for teacher 2
    const r3 = await db.query(
      `SELECT s.id, s.name, s.subject_code, s.tgc_semester
       FROM subjects s
       JOIN subject_teacher_assignments sta ON sta.subject_id = s.id
       WHERE sta.teacher_id = $1 AND s.is_tgc = TRUE`,
      [2]
    );
    console.log('Teacher 2 TGC subjects:', r3.rows);
  } catch(e) {
    console.error('ERROR:', e.message, e.stack);
  }
  process.exit(0);
}
test();
