# Habesha Exam Center
Online examination and student progress tracking platform for Ethiopian students (Grades 6, 8, 12).

## Files (single folder, no subfolders)
- `index.html`, `style.css`, `app.js`: interface, styling, exam engine, LocalStorage progress.
- `gN-subject.json`: question banks (id, grade, subject, topic, question, options, answer index, explanation).

## Run
Questions load with `fetch`, so open via a web server (not by double-clicking): `python3 -m http.server`, then visit http://localhost:8000. For GitHub Pages: Settings > Pages > deploy from the main branch root.

## Notes
- Progress is stored in this browser only (keys `hec_*`); clearing browser data erases it.
- Mock exams are timed (1 minute per question) but not proctored.
- Question content must be reviewed against the curriculum before publishing; the target is 50 per subject per grade.
