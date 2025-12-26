/**
 * Application-wide constants
 */

// API Configuration
export const API_ROUTES = {
  tasks: "/api/tasks",
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
} as const;

// Accessibility
export const ARIA_LABELS = {
  mainContent: "Main content",
  skipToContent: "Skip to main content",
  navigation: "Main navigation",
  taskOptions: (title: string) => `Task options for "${title}"`,
  markComplete: (title: string) => `Mark "${title}" as complete`,
  markIncomplete: (title: string) => `Mark "${title}" as incomplete`,
  openDetails: (title: string) => `Open details for task: ${title}`,
  dragToReorder: (title: string) => `Drag to reorder task: ${title}`,
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
