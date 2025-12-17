# ProfDash

**Academic Productivity Dashboard for Professors**

A comprehensive productivity tool designed specifically for professors and academics to manage their research, teaching, grants, and mentorship responsibilities.

## Features

### Task Management
- **Today View** - Todoist-style daily task list with progress tracking
- **Upcoming View** - 14-day timeline of upcoming tasks
- **Board View** - Kanban-style columns (To Do, In Progress, Done)
- **List View** - Sortable table view of all tasks
- **Calendar View** - Monthly calendar with task visualization
- **Quick Add** - Natural language task entry (e.g., "NSF report fri #grants p1")

### Research Pipeline
- Track papers through stages: Idea → Drafting → In Review → Revision → Published
- Visual indicators for stalled papers
- Journal and author tracking

### Grant Management
- Active grant tracking with burn rate visualization
- Budget vs. timeline alignment
- Deliverable tracking
- Upcoming opportunity deadlines

### Lab Personnel
- Track PhD students, postdocs, undergrads, and staff
- 1:1 meeting tracking with overdue alerts
- Milestone tracking
- Funding source information

### Teaching Dashboard
- Course management with evaluation scores
- ESCI trend visualization
- Teaching innovation log

### Dossier Builder
- Aggregate metrics for promotion materials
- Research, teaching, grants, and mentoring summaries

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/profdash.git
   cd profdash
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment** (optional - for cloud sync)
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

## Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Node.js, Express
- **Database**: Supabase (PostgreSQL) with localStorage fallback
- **Authentication**: Supabase Auth (optional)

## Project Structure

```
profdash/
├── public/
│   ├── index.html        # Main dashboard page
│   ├── css/
│   │   └── dashboard.css # All styles
│   └── js/
│       ├── app.js        # Main application logic
│       └── database.js   # Database abstraction layer
├── server/
│   ├── index.js          # Express server
│   └── schema.sql        # Database schema for Supabase
├── .env.example          # Environment variables template
├── package.json
└── README.md
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Your Supabase project URL | For cloud sync |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | For cloud sync |
| `PORT` | Server port (default: 3000) | No |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | For calendar sync |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | For calendar sync |

### Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `server/schema.sql`
3. Copy your project URL and anon key to `.env`
4. Enable Email/Password auth in Authentication settings

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Q` | Focus quick add input |
| `N` | Open new task modal |
| `1-5` | Switch views (Today, Upcoming, Board, List, Calendar) |
| `/` | Focus search |
| `Esc` | Close modals |

## Task Quick Add Syntax

```
NSF report fri #grants p1
```

- **fri** - Due Friday
- **#grants** - Category (research, teaching, grants, grad, undergrad, admin, misc)
- **p1** - Priority (p1=urgent, p2=high, p3=medium, p4=low)

Other date keywords: `today`, `tomorrow`, `mon`, `tue`, `wed`, `thu`, `fri`, `sat`, `sun`

## Data Storage

ProfDash uses a hybrid storage approach:

1. **Primary**: Supabase (PostgreSQL) - when configured, data syncs across devices
2. **Fallback**: localStorage - works offline and without configuration

All data is isolated per user with Row Level Security (RLS) policies.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with ❤️ for academics who need to get things done.
