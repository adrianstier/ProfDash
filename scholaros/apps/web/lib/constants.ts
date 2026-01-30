/**
 * Application-wide constants
 */

// API Configuration
export const API_ROUTES = {
  tasks: "/api/tasks",
  taskTemplates: "/api/task-templates",
  workspaces: "/api/workspaces",
  projects: "/api/projects",
  grants: "/api/grants",
  calendar: "/api/calendar",
  ai: "/api/ai",
} as const;

// Pagination
export const PAGINATION = {
  defaultPageSize: 20,
  maxPageSize: 100,
  pageSizeOptions: [10, 20, 50, 100],
} as const;

// UI Messages
export const MESSAGES = {
  errors: {
    unauthorized: "Unauthorized",
    notFound: "Not found",
    serverError: "Internal server error",
    validationFailed: "Validation failed",
    rateLimited: "Too many requests. Please try again later.",
    fetchFailed: "Failed to fetch data",
    createFailed: "Failed to create",
    updateFailed: "Failed to update",
    deleteFailed: "Failed to delete",
    unexpectedError: "An unexpected error occurred",
  },
  success: {
    created: "Created successfully",
    updated: "Updated successfully",
    deleted: "Deleted successfully",
    saved: "Saved successfully",
  },
  loading: {
    default: "Loading...",
    saving: "Saving...",
    deleting: "Deleting...",
  },
  empty: {
    tasks: "No tasks to show for this view.",
    projects: "No projects found.",
    allCaughtUp: "All caught up!",
  },
  confirmations: {
    delete: "Are you sure you want to delete this?",
    deleteTask: "Are you sure you want to delete this task?",
    unsavedChanges: "You have unsaved changes. Are you sure you want to leave?",
  },
} as const;

// Placeholders
export const PLACEHOLDERS = {
  quickAdd: "Add task... (e.g., 'NSF report fri #grants p1')",
  email: "you@university.edu",
  search: "Search...",
} as const;

// Date formatting
export const DATE_LABELS = {
  today: "Today",
  tomorrow: "Tomorrow",
  yesterday: "Yesterday",
} as const;

// Priority labels and descriptions
export const PRIORITY_LABELS = {
  p1: "Urgent",
  p2: "High",
  p3: "Medium",
  p4: "Low",
} as const;

// Category labels
export const CATEGORY_LABELS = {
  research: "Research",
  teaching: "Teaching",
  grants: "Grants",
  "grad-mentorship": "Grad Mentorship",
  "undergrad-mentorship": "Undergrad Mentorship",
  admin: "Admin",
  misc: "Misc",
  // Academic categories (ported from academic-to-do-app)
  meeting: "Meeting",
  analysis: "Analysis",
  submission: "Submission",
  revision: "Revision",
  presentation: "Presentation",
  writing: "Writing",
  reading: "Reading",
  coursework: "Coursework",
} as const;

// Category display configuration with colors and icons (Lucide icon names)
export const CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; iconName: string }
> = {
  research: {
    label: "Research",
    color: "#7C3AED",
    bgColor: "rgba(124, 58, 237, 0.1)",
    iconName: "BookOpen",
  },
  teaching: {
    label: "Teaching",
    color: "#059669",
    bgColor: "rgba(5, 150, 105, 0.1)",
    iconName: "GraduationCap",
  },
  grants: {
    label: "Grants",
    color: "#D97706",
    bgColor: "rgba(217, 119, 6, 0.1)",
    iconName: "Banknote",
  },
  "grad-mentorship": {
    label: "Grad Mentorship",
    color: "#0891B2",
    bgColor: "rgba(8, 145, 178, 0.1)",
    iconName: "Users",
  },
  "undergrad-mentorship": {
    label: "Undergrad Mentorship",
    color: "#6366F1",
    bgColor: "rgba(99, 102, 241, 0.1)",
    iconName: "Users",
  },
  admin: {
    label: "Admin",
    color: "#64748B",
    bgColor: "rgba(100, 116, 139, 0.1)",
    iconName: "ClipboardList",
  },
  misc: {
    label: "Misc",
    color: "#9CA3AF",
    bgColor: "rgba(156, 163, 175, 0.1)",
    iconName: "FileText",
  },
  meeting: {
    label: "Meeting",
    color: "#0891B2",
    bgColor: "rgba(8, 145, 178, 0.1)",
    iconName: "Users",
  },
  analysis: {
    label: "Analysis",
    color: "#059669",
    bgColor: "rgba(5, 150, 105, 0.1)",
    iconName: "BarChart3",
  },
  submission: {
    label: "Submission",
    color: "#DC2626",
    bgColor: "rgba(220, 38, 38, 0.1)",
    iconName: "Send",
  },
  revision: {
    label: "Revision",
    color: "#D97706",
    bgColor: "rgba(217, 119, 6, 0.1)",
    iconName: "RotateCcw",
  },
  presentation: {
    label: "Presentation",
    color: "#E87722",
    bgColor: "rgba(232, 119, 34, 0.1)",
    iconName: "Presentation",
  },
  writing: {
    label: "Writing",
    color: "#3B82F6",
    bgColor: "rgba(59, 130, 246, 0.1)",
    iconName: "PenTool",
  },
  reading: {
    label: "Reading",
    color: "#6366F1",
    bgColor: "rgba(99, 102, 241, 0.1)",
    iconName: "BookMarked",
  },
  coursework: {
    label: "Coursework",
    color: "#EC4899",
    bgColor: "rgba(236, 72, 153, 0.1)",
    iconName: "GraduationCap",
  },
} as const;

// Accessibility
export const ARIA_LABELS = {
  // Navigation
  mainContent: "Main content",
  skipToContent: "Skip to main content",
  navigation: "Main navigation",

  // Task actions
  taskOptions: (title: string) => `Task options for "${title}"`,
  markComplete: (title: string) => `Mark "${title}" as complete`,
  markIncomplete: (title: string) => `Mark "${title}" as incomplete`,
  openDetails: (title: string) => `Open details for task: ${title}`,
  dragToReorder: (title: string) => `Drag to reorder task: ${title}`,

  // Project actions
  editProject: (title: string) => `Edit project "${title}"`,
  deleteProject: (title: string) => `Delete project "${title}"`,
  projectOptions: (title: string) => `Project options for "${title}"`,
  viewProject: (title: string) => `View project "${title}"`,

  // General actions
  close: "Close",
  closeDialog: "Close dialog",
  closeDrawer: "Close drawer",
  edit: "Edit",
  delete: "Delete",
  save: "Save changes",
  cancel: "Cancel",
  loading: "Loading",

  // Form fields
  selectStatus: "Select status",
  selectPriority: "Select priority",
  selectCategory: "Select category",
  selectDueDate: "Select due date",
  selectProject: "Select project",

  // File operations
  uploadFile: "Upload file",
  browseFiles: "Browse files",
  dropZone: "Drop zone for file upload",
  exportCsv: "Export as CSV",
  exportJson: "Export as JSON",
  dismissResult: "Dismiss import result",
} as const;

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  quickAdd: "Q",
  search: "/",
  escape: "Escape",
  enter: "Enter",
} as const;

// App metadata
export const APP_NAME = "ScholarOS";
export const APP_DESCRIPTION = "Academic productivity dashboard for researchers";

// Route paths
export const ROUTES = {
  home: "/",
  login: "/login",
  signup: "/signup",
  today: "/today",
  upcoming: "/upcoming",
  board: "/board",
  list: "/list",
  calendar: "/calendar",
  projects: "/projects",
  grants: "/grants",
  personnel: "/personnel",
  teaching: "/teaching",
  settings: "/settings",
} as const;
