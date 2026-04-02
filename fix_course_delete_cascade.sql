-- This script will fix the foreign key constraint error when deleting a course.
-- It tells the database: "If a course is deleted, automatically delete all enrollments linked to it."
ALTER TABLE enrollments 
DROP CONSTRAINT IF EXISTS enrollments_course_id_fkey,
ADD CONSTRAINT enrollments_course_id_fkey 
FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
