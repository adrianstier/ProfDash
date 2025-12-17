-- ScholarOS Development Seed Data
-- This file seeds sample data for local development

-- Note: In development, you'll need to create a test user first via the Supabase dashboard
-- or by signing up through the app. Then update the user_id below.

-- Sample workspace (will be created after user signs up)
-- INSERT INTO workspaces (id, name, slug, created_by)
-- VALUES (
--   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
--   'My Lab',
--   'my-lab',
--   '<user_id>'
-- );

-- Sample tasks (will be created after user signs up)
-- These are examples of the data structure:

/*
INSERT INTO tasks (user_id, title, description, category, priority, status, due)
VALUES
  ('<user_id>', 'Review NSF proposal draft', 'Final review before submission deadline', 'grants', 'p1', 'todo', CURRENT_DATE),
  ('<user_id>', 'Grade midterm exams', 'CS 101 midterms - 45 students', 'teaching', 'p2', 'todo', CURRENT_DATE + INTERVAL '1 day'),
  ('<user_id>', 'Weekly lab meeting', 'Discuss progress on ML project', 'research', 'p2', 'todo', CURRENT_DATE),
  ('<user_id>', 'Submit travel reimbursement', 'Conference expenses from last month', 'admin', 'p3', 'todo', CURRENT_DATE + INTERVAL '3 days'),
  ('<user_id>', 'Prepare lecture slides', 'Machine Learning Week 8', 'teaching', 'p2', 'progress', CURRENT_DATE + INTERVAL '2 days'),
  ('<user_id>', 'Review paper for ICML', 'Assigned as reviewer', 'research', 'p1', 'todo', CURRENT_DATE + INTERVAL '7 days');
*/

-- Sample funding opportunities (public data)
INSERT INTO funding_opportunities (source, title, agency, mechanism, deadline, amount_min, amount_max, description, url)
VALUES
  ('grants.gov', 'NSF CAREER: Faculty Early Career Development Program', 'NSF', 'CAREER', '2025-07-26', 400000, 800000, 'Supports early-career faculty who have the potential to serve as academic role models in research and education.', 'https://www.nsf.gov/funding/pgm_summ.jsp?pims_id=503214'),
  ('grants.gov', 'NIH R01 Research Project Grant', 'NIH', 'R01', '2025-02-05', 250000, 500000, 'Support a discrete, specified, circumscribed research project.', 'https://grants.nih.gov/grants/guide/pa-files/PA-20-185.html'),
  ('grants.gov', 'DOE Early Career Research Program', 'DOE', 'Early Career', '2025-04-15', 150000, 250000, 'Support the development of individual research programs of outstanding scientists early in their careers.', 'https://science.osti.gov/early-career')
ON CONFLICT DO NOTHING;
