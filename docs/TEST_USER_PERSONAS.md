# ScholarOS Test User Personas

## 10 AI Test Users for Comprehensive Platform Testing

---

## 1. Dr. Sarah Chen - The Overwhelmed New PI
**Role:** Assistant Professor, Marine Biology
**Tech Savvy:** Medium
**Primary Goals:** Manage first lab, track NSF grant, publish 3 papers
**Pain Points:** Never used academic productivity tools before, drowning in admin

**User Journey:**
1. Signs up via Google OAuth
2. Creates workspace "Chen Lab"
3. Tries to add first task using natural language
4. Attempts to import a grant deadline from email
5. Wants to see all deadlines on calendar view
6. Tries to invite a grad student

**Expected Behaviors:**
- Will try typing full sentences in quick-add
- May not understand priority syntax (p1, p2)
- Will look for "help" or "tutorial" features
- May get confused by empty states

---

## 2. Prof. Marcus Thompson - The Power User
**Role:** Full Professor, Computer Science, runs 15-person lab
**Tech Savvy:** Very High
**Primary Goals:** Delegate tasks, track multiple grants, manage publications
**Pain Points:** Needs keyboard shortcuts, bulk operations, API access

**User Journey:**
1. Immediately looks for keyboard shortcuts
2. Tries Cmd+K for command palette
3. Wants to bulk import tasks from CSV
4. Needs to assign tasks to multiple people
5. Wants to filter by multiple criteria simultaneously
6. Expects dark mode toggle

**Expected Behaviors:**
- Will try keyboard shortcuts that don't exist
- Will look for bulk operations
- Will want export functionality
- Will test edge cases

---

## 3. Dr. Aisha Patel - The Grant Hunter
**Role:** Associate Professor, Biomedical Engineering
**Tech Savvy:** Medium
**Primary Goals:** Find and track grant opportunities, manage deadlines
**Pain Points:** Misses grant deadlines, can't find relevant opportunities

**User Journey:**
1. Goes straight to Grants section
2. Searches for NIH R01 opportunities
3. Wants to save search criteria
4. Tries to set deadline reminders
5. Wants to see grant fit scoring
6. Needs to export grant list for collaborators

**Expected Behaviors:**
- Will search with specific agency names
- Will expect filtering by deadline proximity
- Will want email notifications for new matches
- Will need collaborative sharing features

---

## 4. Dr. James Okonkwo - The Publication Tracker
**Role:** Associate Professor, Economics
**Tech Savvy:** Low-Medium
**Primary Goals:** Track 8 papers in various stages, manage co-authors
**Pain Points:** Loses track of revision deadlines, co-author coordination

**User Journey:**
1. Navigates to Publications
2. Tries to import existing paper via DOI
3. Wants to add co-authors with email
4. Needs to track revision history
5. Wants notifications when status changes
6. Tries to link tasks to specific papers

**Expected Behaviors:**
- Will import papers by DOI frequently
- Will want journal tracking
- Will expect manuscript version control
- May struggle with drag-and-drop on mobile

---

## 5. Maria Santos - The Graduate Student
**Role:** PhD Student, Chemistry (3rd year)
**Tech Savvy:** High
**Primary Goals:** Manage dissertation tasks, track experiments, please advisor
**Pain Points:** Needs approval workflows, advisor visibility

**User Journey:**
1. Receives workspace invite from PI
2. Accepts and joins workspace
3. Views tasks assigned to her
4. Tries to update task status
5. Wants to add notes to tasks
6. Needs to request extension on deadline

**Expected Behaviors:**
- Will be limited member role
- Will want to filter "my tasks"
- Will need mobile access for lab work
- May want private notes feature

---

## 6. Dr. Robert Kim - The Teaching-Heavy Professor
**Role:** Senior Lecturer, History
**Tech Savvy:** Medium
**Primary Goals:** Balance teaching load with minimal research
**Pain Points:** Teaching prep dominates, limited time for research

**User Journey:**
1. Creates workspace for teaching tasks
2. Adds course-related tasks with #teaching
3. Tries to create recurring tasks (weekly lectures)
4. Wants to see teaching vs research time split
5. Needs semester-based views
6. Wants to archive completed courses

**Expected Behaviors:**
- Will use categories heavily
- Will want recurring task feature
- Will look for time tracking
- Will want semester/term organization

---

## 7. Dr. Elena Volkov - The International Collaborator
**Role:** Professor, Physics (based in Germany)
**Tech Savvy:** Medium-High
**Primary Goals:** Coordinate with US collaborators, manage multi-site grant
**Pain Points:** Timezone issues, language preferences, date formats

**User Journey:**
1. Signs up, expects European date format
2. Adds collaborators in different timezones
3. Sets deadlines with timezone awareness
4. Wants interface in different language (future)
5. Needs to see team members' local times
6. Coordinates meeting scheduling

**Expected Behaviors:**
- Will be confused by US date format (MM/DD)
- Will want 24-hour time format
- Will need clear timezone indicators
- May have network latency issues

---

## 8. Dr. Patricia Williams - The Department Chair
**Role:** Department Chair, Sociology
**Tech Savvy:** Low
**Primary Goals:** Oversee faculty productivity, track departmental grants
**Pain Points:** Needs bird's-eye view, reporting for dean

**User Journey:**
1. Creates departmental workspace
2. Invites all faculty members
3. Wants dashboard showing all projects
4. Needs reporting/analytics features
5. Wants to see grant pipeline status
6. Needs to export reports for administration

**Expected Behaviors:**
- Will want read-only views of others' work
- Will need summary reports
- Will want aggregate statistics
- May not interact daily - monthly check-ins

---

## 9. Dr. Kevin Nguyen - The Mobile-First User
**Role:** Assistant Professor, Field Biology
**Tech Savvy:** High
**Primary Goals:** Manage tasks from field locations, quick capture
**Pain Points:** Unreliable internet, needs offline access

**User Journey:**
1. Primarily uses mobile device
2. Tries to quick-add task while in field
3. Loses connection mid-task
4. Wants voice input for tasks
5. Needs photo attachment for field notes
6. Syncs when back online

**Expected Behaviors:**
- Will test mobile navigation extensively
- Will encounter network issues
- Will want offline mode (PWA)
- Will use voice features if available

---

## 10. Dr. Lisa Anderson - The Skeptical Late Adopter
**Role:** Full Professor, English Literature
**Tech Savvy:** Very Low
**Primary Goals:** Reluctantly track tasks required by department
**Pain Points:** Prefers paper, easily frustrated by tech

**User Journey:**
1. Follows emailed invitation link
2. Gets confused at signup
3. Looks for simple "add task" button
4. Gets overwhelmed by dashboard
5. Wants minimal interface option
6. Needs clear undo/help options

**Expected Behaviors:**
- Will miss non-obvious UI elements
- Will want larger text options
- Will need extensive onboarding
- Will abandon if frustrated

---

## Testing Matrix

| Persona | Critical Paths | Priority |
|---------|---------------|----------|
| Sarah (New PI) | Onboarding, Quick Add, Calendar | P1 |
| Marcus (Power User) | Keyboard shortcuts, Bulk ops, API | P2 |
| Aisha (Grant Hunter) | Grant search, Filters, Reminders | P1 |
| James (Publications) | DOI import, Pipeline, Co-authors | P1 |
| Maria (Grad Student) | Invite flow, Limited perms, Mobile | P1 |
| Robert (Teaching) | Recurring tasks, Categories, Archive | P2 |
| Elena (International) | Timezones, Date formats, i18n | P2 |
| Patricia (Chair) | Multi-workspace, Reports, Read-only | P3 |
| Kevin (Mobile) | Mobile UX, Offline, Voice | P1 |
| Lisa (Late Adopter) | Simple UI, Onboarding, Help | P1 |
