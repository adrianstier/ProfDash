/**
 * ProfDash - Academic Productivity Dashboard
 * Main Application Logic
 */

(function() {
    'use strict';

    // ============================================
    // STATE & CONSTANTS
    // ============================================
    let tasks = [];
    let papers = [];
    let grants = [];
    let grantOpportunities = [];
    let personnel = [];
    let courses = [];
    let innovations = [];

    let currentView = 'today';
    let currentFilter = 'all';
    let currentTaskId = null;
    let calendarDate = new Date();
    let searchQuery = '';

    const categoryLabels = {
        'research': 'Research',
        'teaching': 'Teaching',
        'grants': 'Grants',
        'grad-mentorship': 'Grad Mentorship',
        'undergrad-mentorship': 'Undergrad Mentorship',
        'admin': 'Service/Admin',
        'misc': 'Miscellaneous'
    };

    const priorityLabels = {
        'urgent': 'Urgent',
        'high': 'High',
        'medium': 'Medium',
        'low': 'Low'
    };

    const statusLabels = {
        'todo': 'To Do',
        'progress': 'In Progress',
        'done': 'Done'
    };

    // ============================================
    // INITIALIZATION
    // ============================================
    async function init() {
        // Initialize database
        if (window.dashboardDB) {
            await window.dashboardDB.init();
        }

        // Load data from storage
        tasks = loadData('tasks', []);
        papers = loadData('papers', []);
        grants = loadData('grants', []);
        grantOpportunities = loadData('grantOpportunities', []);
        personnel = loadData('personnel', []);
        courses = loadData('courses', []);
        innovations = loadData('innovations', []);

        // Load saved view/filter preferences
        currentView = loadData('currentView', 'today');
        currentFilter = loadData('currentFilter', 'all');

        // Set today's date
        updateTodayDate();

        // Load streak
        loadStreak();

        // Render initial view
        switchView(currentView);
        setFilter(currentFilter);

        // Update all counts and progress
        updateStats();
        updateTodayProgress();
    }

    // ============================================
    // DATA PERSISTENCE
    // ============================================
    function loadData(key, defaultValue) {
        try {
            const stored = localStorage.getItem('profdash-' + key);
            return stored ? JSON.parse(stored) : defaultValue;
        } catch (e) {
            console.error('Error loading data:', e);
            return defaultValue;
        }
    }

    function saveData(key, value) {
        try {
            localStorage.setItem('profdash-' + key, JSON.stringify(value));
        } catch (e) {
            console.error('Error saving data:', e);
        }
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    function formatDateISO(date) {
        return date.toISOString().split('T')[0];
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function getDueInfo(dueDate) {
        if (!dueDate) return { text: '', class: '' };

        const due = new Date(dueDate);
        if (isNaN(due.getTime())) return { text: '', class: '' };

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        due.setHours(0, 0, 0, 0);

        const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return { text: `${Math.abs(diffDays)}d overdue`, class: 'task-card-due--overdue' };
        } else if (diffDays === 0) {
            return { text: 'Today', class: 'task-card-due--soon' };
        } else if (diffDays === 1) {
            return { text: 'Tomorrow', class: 'task-card-due--soon' };
        } else if (diffDays <= 7) {
            return { text: `${diffDays}d`, class: 'task-card-due--soon' };
        } else {
            return { text: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), class: '' };
        }
    }

    function getCategoryColor(category) {
        const colors = {
            'research': '#3b82f6',
            'teaching': '#8b5cf6',
            'grants': '#10b981',
            'grad-mentorship': '#f59e0b',
            'undergrad-mentorship': '#ec4899',
            'admin': '#6b7280',
            'misc': '#78716c'
        };
        return colors[category] || '#6b7280';
    }

    function updateTodayDate() {
        const el = document.getElementById('today-date');
        if (el) {
            const today = new Date();
            el.textContent = today.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
            });
        }
    }

    // ============================================
    // VIEW SWITCHING
    // ============================================
    window.switchView = function(view) {
        currentView = view;
        saveData('currentView', view);

        // Update sidebar buttons
        document.querySelectorAll('.sidebar-btn').forEach(btn => {
            btn.classList.toggle('sidebar-btn--active', btn.dataset.view === view);
        });

        // Show/hide view containers
        document.querySelectorAll('.view-container').forEach(container => {
            container.classList.remove('view-container--active');
        });
        const viewContainer = document.getElementById('view-' + view);
        if (viewContainer) {
            viewContainer.classList.add('view-container--active');
        }

        // Render the view
        renderTasks();
    };

    window.setFilter = function(filter) {
        currentFilter = filter;
        saveData('currentFilter', filter);

        // Update filter buttons
        document.querySelectorAll('.sidebar-filter').forEach(btn => {
            btn.classList.toggle('sidebar-filter--active', btn.dataset.filter === filter);
        });

        renderTasks();
    };

    // ============================================
    // TASK RENDERING
    // ============================================
    function renderTasks() {
        updateStats();

        switch (currentView) {
            case 'today':
                renderTodayView();
                break;
            case 'upcoming':
                renderUpcomingView();
                break;
            case 'board':
                renderBoardView();
                setupDragAndDrop();
                break;
            case 'list':
                renderListView();
                break;
            case 'calendar':
                renderCalendar();
                break;
            case 'pulse':
                renderPulseView();
                break;
            case 'pipeline':
                renderPipelineView();
                break;
            case 'grants':
                renderGrantsView();
                break;
            case 'personnel':
                renderPersonnelView();
                break;
            case 'teaching':
                renderTeachingView();
                break;
            case 'dossier':
                renderDossierView();
                break;
        }
    }

    function getFilteredTasks() {
        let filtered = tasks;

        // Apply category filter
        if (currentFilter !== 'all') {
            filtered = filtered.filter(t => t.category === currentFilter);
        }

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(t =>
                t.title.toLowerCase().includes(query) ||
                (t.description && t.description.toLowerCase().includes(query)) ||
                (t.notes && t.notes.toLowerCase().includes(query))
            );
        }

        return filtered;
    }

    // ============================================
    // TODAY VIEW
    // ============================================
    function renderTodayView() {
        const container = document.getElementById('today-tasks');
        if (!container) return;

        const today = formatDateISO(new Date());
        const filtered = getFilteredTasks();

        // Separate tasks by status
        const overdue = filtered.filter(t => t.due && t.due < today && t.status !== 'done');
        const todayTasks = filtered.filter(t => t.due === today && t.status !== 'done');
        const noDue = filtered.filter(t => !t.due && t.status !== 'done');
        const done = filtered.filter(t => t.status === 'done' && t.due === today);

        let html = '';

        // Overdue section
        if (overdue.length > 0) {
            html += `
                <div class="today-section">
                    <h3 class="today-section-title today-section-title--overdue">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        Overdue
                    </h3>
                    ${overdue.map(t => renderTaskCard(t)).join('')}
                </div>
            `;
        }

        // Today section
        html += `
            <div class="today-section">
                <h3 class="today-section-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    Today
                </h3>
                ${todayTasks.length > 0 ? todayTasks.map(t => renderTaskCard(t)).join('') : '<p class="empty-message">No tasks due today</p>'}
            </div>
        `;

        // No due date section
        if (noDue.length > 0) {
            html += `
                <div class="today-section">
                    <h3 class="today-section-title today-section-title--muted">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                        </svg>
                        No Due Date
                    </h3>
                    ${noDue.map(t => renderTaskCard(t)).join('')}
                </div>
            `;
        }

        // Completed section
        if (done.length > 0) {
            html += `
                <div class="today-section">
                    <h3 class="today-section-title today-section-title--done">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        Completed Today
                    </h3>
                    ${done.map(t => renderTaskCard(t)).join('')}
                </div>
            `;
        }

        container.innerHTML = html;
        updateTodayProgress();
    }

    function renderTaskCard(task) {
        const dueInfo = getDueInfo(task.due);
        const isDone = task.status === 'done';

        return `
            <div class="task-card task-card--${task.priority} ${isDone ? 'task-card--done' : ''}"
                 data-id="${task.id}" draggable="true">
                <div class="task-card-checkbox">
                    <input type="checkbox" ${isDone ? 'checked' : ''}
                           onchange="toggleTaskDone('${task.id}', this.checked)">
                </div>
                <div class="task-card-content" onclick="openTaskDetail('${task.id}')">
                    <div class="task-card-title">${escapeHtml(task.title)}</div>
                    <div class="task-card-meta">
                        <span class="task-card-category" style="--category-color: ${getCategoryColor(task.category)}">
                            ${categoryLabels[task.category]}
                        </span>
                        ${task.due ? `<span class="task-card-due ${dueInfo.class}">${dueInfo.text}</span>` : ''}
                    </div>
                </div>
                <div class="task-card-priority task-card-priority--${task.priority}">
                    ${priorityLabels[task.priority]}
                </div>
            </div>
        `;
    }

    function updateTodayProgress() {
        const today = formatDateISO(new Date());
        const todayTasks = tasks.filter(t => t.due === today);
        const doneTasks = todayTasks.filter(t => t.status === 'done');

        const doneEl = document.getElementById('today-done');
        const totalEl = document.getElementById('today-total');
        const fillEl = document.getElementById('today-progress-fill');

        if (doneEl) doneEl.textContent = doneTasks.length;
        if (totalEl) totalEl.textContent = todayTasks.length;
        if (fillEl) {
            const percent = todayTasks.length > 0 ? (doneTasks.length / todayTasks.length) * 100 : 0;
            fillEl.style.width = percent + '%';
        }
    }

    // ============================================
    // UPCOMING VIEW
    // ============================================
    function renderUpcomingView() {
        const container = document.getElementById('upcoming-tasks');
        if (!container) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const filtered = getFilteredTasks().filter(t => t.status !== 'done');

        let html = '';

        // Group by date for next 14 days
        for (let i = 0; i < 14; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            const dateStr = formatDateISO(date);

            const dayTasks = filtered.filter(t => t.due === dateStr);
            if (dayTasks.length === 0) continue;

            const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' :
                date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

            html += `
                <div class="upcoming-day">
                    <div class="upcoming-day-header">
                        <span class="upcoming-day-label">${dayLabel}</span>
                        <span class="upcoming-day-count">${dayTasks.length} tasks</span>
                    </div>
                    <div class="upcoming-day-tasks">
                        ${dayTasks.map(t => renderTaskCard(t)).join('')}
                    </div>
                </div>
            `;
        }

        if (!html) {
            html = '<p class="empty-message">No upcoming tasks in the next 14 days</p>';
        }

        container.innerHTML = html;
    }

    // ============================================
    // BOARD VIEW
    // ============================================
    function renderBoardView() {
        const filtered = getFilteredTasks();

        const todoTasks = filtered.filter(t => t.status === 'todo');
        const progressTasks = filtered.filter(t => t.status === 'progress');
        const doneTasks = filtered.filter(t => t.status === 'done');

        const todoContainer = document.getElementById('tasks-todo');
        const progressContainer = document.getElementById('tasks-progress');
        const doneContainer = document.getElementById('tasks-done');

        if (todoContainer) {
            todoContainer.innerHTML = todoTasks.map(t => renderTaskCard(t)).join('') ||
                '<p class="empty-message">No tasks</p>';
        }
        if (progressContainer) {
            progressContainer.innerHTML = progressTasks.map(t => renderTaskCard(t)).join('') ||
                '<p class="empty-message">No tasks</p>';
        }
        if (doneContainer) {
            doneContainer.innerHTML = doneTasks.map(t => renderTaskCard(t)).join('') ||
                '<p class="empty-message">No tasks</p>';
        }
    }

    // ============================================
    // LIST VIEW
    // ============================================
    function renderListView() {
        const tbody = document.getElementById('list-body');
        if (!tbody) return;

        const filtered = getFilteredTasks();

        tbody.innerHTML = filtered.map(task => {
            const dueInfo = getDueInfo(task.due);
            return `
                <tr class="list-row ${task.status === 'done' ? 'list-row--done' : ''}">
                    <td>
                        <div class="list-task">
                            <input type="checkbox" ${task.status === 'done' ? 'checked' : ''}
                                   onchange="toggleTaskDone('${task.id}', this.checked)">
                            <span class="list-task-title" onclick="openTaskDetail('${task.id}')">${escapeHtml(task.title)}</span>
                        </div>
                    </td>
                    <td>
                        <span class="list-category">
                            <span class="list-category-dot" style="background: ${getCategoryColor(task.category)}"></span>
                            ${categoryLabels[task.category]}
                        </span>
                    </td>
                    <td>
                        <span class="task-card-priority task-card-priority--${task.priority}">${priorityLabels[task.priority]}</span>
                    </td>
                    <td>
                        <span class="${dueInfo.class}">${task.due || '-'}</span>
                    </td>
                    <td>
                        <span class="list-status list-status--${task.status}">${statusLabels[task.status]}</span>
                    </td>
                    <td>
                        <div class="list-actions">
                            <button class="list-action-btn" onclick="editTask('${task.id}')" title="Edit">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                            <button class="list-action-btn list-action-btn--delete" onclick="deleteTask('${task.id}')" title="Delete">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ============================================
    // CALENDAR VIEW
    // ============================================
    function renderCalendar() {
        const monthEl = document.getElementById('calendar-month');
        const daysEl = document.getElementById('calendar-days');

        if (!monthEl || !daysEl) return;

        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();

        monthEl.textContent = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startPadding = firstDay.getDay();
        const totalDays = lastDay.getDate();

        const today = new Date();
        const todayStr = formatDateISO(today);

        let html = '';

        // Previous month padding
        const prevMonth = new Date(year, month, 0);
        for (let i = startPadding - 1; i >= 0; i--) {
            html += `<div class="calendar-day calendar-day--other">${prevMonth.getDate() - i}</div>`;
        }

        // Current month days
        for (let day = 1; day <= totalDays; day++) {
            const date = new Date(year, month, day);
            const dateStr = formatDateISO(date);
            const isToday = dateStr === todayStr;

            const dayTasks = tasks.filter(t => t.due === dateStr && t.status !== 'done');

            html += `
                <div class="calendar-day ${isToday ? 'calendar-day--today' : ''}" data-date="${dateStr}">
                    <div class="calendar-day-number">${day}</div>
                    <div class="calendar-day-tasks">
                        ${dayTasks.slice(0, 3).map(t => `
                            <div class="calendar-task calendar-task--${t.category}"
                                 onclick="openTaskDetail('${t.id}')"
                                 title="${escapeHtml(t.title)}">
                                ${escapeHtml(t.title)}
                            </div>
                        `).join('')}
                        ${dayTasks.length > 3 ? `<div class="calendar-more">+${dayTasks.length - 3} more</div>` : ''}
                    </div>
                </div>
            `;
        }

        // Next month padding
        const remaining = (7 - ((startPadding + totalDays) % 7)) % 7;
        for (let i = 1; i <= remaining; i++) {
            html += `<div class="calendar-day calendar-day--other">${i}</div>`;
        }

        daysEl.innerHTML = html;
    }

    window.prevMonth = function() {
        calendarDate.setMonth(calendarDate.getMonth() - 1);
        renderCalendar();
    };

    window.nextMonth = function() {
        calendarDate.setMonth(calendarDate.getMonth() + 1);
        renderCalendar();
    };

    // ============================================
    // PULSE VIEW
    // ============================================
    function renderPulseView() {
        const container = document.getElementById('pulse-content');
        if (!container) return;

        const today = new Date();
        const thisWeekStart = new Date(today);
        thisWeekStart.setDate(today.getDate() - today.getDay());
        const thisWeekStartStr = formatDateISO(thisWeekStart);

        // Calculate metrics
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'done').length;
        const inProgressTasks = tasks.filter(t => t.status === 'progress').length;
        const overdueTasks = tasks.filter(t => t.due && t.due < formatDateISO(today) && t.status !== 'done').length;

        // This week's completions
        const weekCompletions = tasks.filter(t =>
            t.status === 'done' &&
            t.completedAt &&
            t.completedAt >= thisWeekStartStr
        ).length;

        // Category breakdown
        const categoryBreakdown = Object.keys(categoryLabels).map(cat => ({
            category: cat,
            label: categoryLabels[cat],
            count: tasks.filter(t => t.category === cat && t.status !== 'done').length,
            color: getCategoryColor(cat)
        })).filter(c => c.count > 0);

        container.innerHTML = `
            <div class="pulse-grid">
                <div class="pulse-card pulse-card--primary">
                    <div class="pulse-card-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                    </div>
                    <div class="pulse-card-value">${completedTasks}</div>
                    <div class="pulse-card-label">Tasks Completed</div>
                </div>
                <div class="pulse-card">
                    <div class="pulse-card-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                    </div>
                    <div class="pulse-card-value">${inProgressTasks}</div>
                    <div class="pulse-card-label">In Progress</div>
                </div>
                <div class="pulse-card ${overdueTasks > 0 ? 'pulse-card--danger' : ''}">
                    <div class="pulse-card-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                    </div>
                    <div class="pulse-card-value">${overdueTasks}</div>
                    <div class="pulse-card-label">Overdue</div>
                </div>
                <div class="pulse-card">
                    <div class="pulse-card-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
                        </svg>
                    </div>
                    <div class="pulse-card-value">${weekCompletions}</div>
                    <div class="pulse-card-label">This Week</div>
                </div>
            </div>

            <div class="pulse-section">
                <h3>Tasks by Category</h3>
                <div class="pulse-breakdown">
                    ${categoryBreakdown.map(c => `
                        <div class="pulse-breakdown-item">
                            <div class="pulse-breakdown-label">
                                <span class="pulse-breakdown-dot" style="background: ${c.color}"></span>
                                ${c.label}
                            </div>
                            <div class="pulse-breakdown-bar">
                                <div class="pulse-breakdown-fill" style="width: ${(c.count / Math.max(...categoryBreakdown.map(x => x.count))) * 100}%; background: ${c.color}"></div>
                            </div>
                            <div class="pulse-breakdown-count">${c.count}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // ============================================
    // RESEARCH PIPELINE
    // ============================================
    function renderPipelineView() {
        const container = document.getElementById('pipeline-kanban');
        if (!container) return;

        const stages = [
            { id: 'idea', label: 'Idea', icon: '💡' },
            { id: 'drafting', label: 'Drafting', icon: '✏️' },
            { id: 'review', label: 'In Review', icon: '📝' },
            { id: 'revision', label: 'Revision', icon: '🔄' },
            { id: 'published', label: 'Published', icon: '✅' }
        ];

        container.innerHTML = stages.map(stage => {
            const stagePapers = papers.filter(p => p.status === stage.id);
            const daysSinceUpdate = (paper) => {
                const lastUpdate = new Date(paper.lastUpdate);
                const today = new Date();
                return Math.floor((today - lastUpdate) / (1000 * 60 * 60 * 24));
            };

            return `
                <div class="pipeline-column pipeline-column--${stage.id}">
                    <div class="pipeline-column-header">
                        <div class="pipeline-column-title">
                            <span>${stage.icon}</span>
                            <h4>${stage.label}</h4>
                        </div>
                        <span class="pipeline-column-count">${stagePapers.length}</span>
                    </div>
                    <div class="pipeline-cards">
                        ${stagePapers.map(paper => {
                            const days = daysSinceUpdate(paper);
                            const isStalled = days > 60 && stage.id !== 'published' && stage.id !== 'idea';
                            return `
                                <div class="paper-card ${isStalled ? 'paper-card--stalled' : ''}" onclick="openPaperModal('${paper.id}')">
                                    <h5 class="paper-card-title">${escapeHtml(paper.title)}</h5>
                                    <div class="paper-card-authors">${escapeHtml(paper.authors)}</div>
                                    <div class="paper-card-meta">
                                        <span class="paper-card-journal">${escapeHtml(paper.journal)}</span>
                                        <span class="paper-card-days">${days}d ago</span>
                                    </div>
                                </div>
                            `;
                        }).join('') || '<div class="empty-column"><p>No papers</p></div>'}
                    </div>
                </div>
            `;
        }).join('');

        // Update sidebar badge
        const badge = document.getElementById('pipeline-badge');
        if (badge) badge.textContent = papers.filter(p => p.status !== 'published').length;
    }

    window.openPaperModal = function(paperId = null) {
        const paper = paperId ? papers.find(p => p.id === paperId) : null;
        const modal = document.createElement('div');
        modal.className = 'modal-overlay show';
        modal.id = 'paper-modal';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2>${paper ? 'Edit Paper' : 'Add Paper'}</h2>
                    <button class="modal-close" onclick="closePaperModal()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <form onsubmit="savePaper(event, '${paperId || ''}')">
                    <div class="form-group">
                        <label>Title</label>
                        <input type="text" id="paper-title" value="${paper ? escapeHtml(paper.title) : ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Authors</label>
                        <input type="text" id="paper-authors" value="${paper ? escapeHtml(paper.authors) : ''}" placeholder="e.g., Smith, Johnson, Williams">
                    </div>
                    <div class="form-group">
                        <label>Target Journal</label>
                        <input type="text" id="paper-journal" value="${paper ? escapeHtml(paper.journal) : ''}" placeholder="e.g., Nature, Science">
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <select id="paper-status">
                            <option value="idea" ${paper?.status === 'idea' ? 'selected' : ''}>Idea</option>
                            <option value="drafting" ${paper?.status === 'drafting' ? 'selected' : ''}>Drafting</option>
                            <option value="review" ${paper?.status === 'review' ? 'selected' : ''}>In Review</option>
                            <option value="revision" ${paper?.status === 'revision' ? 'selected' : ''}>Revision</option>
                            <option value="published" ${paper?.status === 'published' ? 'selected' : ''}>Published</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Notes</label>
                        <textarea id="paper-notes" rows="3">${paper ? escapeHtml(paper.notes || '') : ''}</textarea>
                    </div>
                    <div class="modal-actions">
                        ${paper ? `<button type="button" class="btn-danger" onclick="deletePaper('${paper.id}')">Delete</button>` : ''}
                        <button type="button" class="btn-secondary" onclick="closePaperModal()">Cancel</button>
                        <button type="submit" class="btn-primary">Save</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    };

    window.closePaperModal = function() {
        document.getElementById('paper-modal')?.remove();
    };

    window.savePaper = function(e, paperId) {
        e.preventDefault();
        const paperData = {
            id: paperId || generateId(),
            title: document.getElementById('paper-title').value.trim(),
            authors: document.getElementById('paper-authors').value.trim(),
            journal: document.getElementById('paper-journal').value.trim(),
            status: document.getElementById('paper-status').value,
            notes: document.getElementById('paper-notes').value.trim(),
            lastUpdate: formatDateISO(new Date()),
            citations: paperId ? papers.find(p => p.id === paperId)?.citations || 0 : 0
        };

        if (paperId) {
            const index = papers.findIndex(p => p.id === paperId);
            if (index !== -1) papers[index] = paperData;
        } else {
            papers.push(paperData);
        }

        saveData('papers', papers);
        closePaperModal();
        renderPipelineView();
        showToast('Paper saved!', 'success');
    };

    window.deletePaper = function(paperId) {
        if (!confirm('Delete this paper?')) return;
        papers = papers.filter(p => p.id !== paperId);
        saveData('papers', papers);
        closePaperModal();
        renderPipelineView();
        showToast('Paper deleted', 'success');
    };

    // ============================================
    // GRANTS VIEW
    // ============================================
    function renderGrantsView() {
        const container = document.getElementById('grants-content');
        if (!container) return;

        const activeGrants = grants.filter(g => g.status === 'active');

        container.innerHTML = `
            <div class="grants-active">
                <h3 class="grants-section-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    Active Grants
                </h3>
                ${activeGrants.length > 0 ? activeGrants.map(grant => {
                    const totalDays = (new Date(grant.endDate) - new Date(grant.startDate)) / (1000 * 60 * 60 * 24);
                    const elapsedDays = (new Date() - new Date(grant.startDate)) / (1000 * 60 * 60 * 24);
                    const timePercent = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
                    const spentPercent = (grant.spent / grant.amount) * 100;

                    let burnHealth = 'healthy';
                    if (spentPercent > timePercent + 15) burnHealth = 'danger';
                    else if (spentPercent > timePercent + 5) burnHealth = 'warning';
                    else if (spentPercent < timePercent - 20) burnHealth = 'warning';

                    return `
                        <div class="grant-card grant-card--${burnHealth === 'healthy' ? '' : burnHealth}" onclick="openGrantModal('${grant.id}')">
                            <div class="grant-card-header">
                                <div>
                                    <h4 class="grant-card-title">${escapeHtml(grant.title)}</h4>
                                    <div class="grant-card-agency">${grant.agency} - ${grant.role}</div>
                                </div>
                                <div class="grant-card-amount">$${(grant.amount / 1000).toFixed(0)}K</div>
                            </div>
                            <div class="grant-burn-rate">
                                <div class="grant-burn-header">
                                    <span>Spent: $${(grant.spent / 1000).toFixed(0)}K (${spentPercent.toFixed(0)}%)</span>
                                    <span>${new Date(grant.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                                </div>
                                <div class="grant-burn-bar">
                                    <div class="grant-burn-spent grant-burn-spent--${burnHealth}" style="width: ${spentPercent}%"></div>
                                    <div class="grant-burn-timeline" style="left: ${timePercent}%"></div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('') : '<p class="empty-message">No active grants. Click "Add Grant" to get started.</p>'}
            </div>
            <div class="grants-upcoming">
                <h3 class="grants-section-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    Upcoming Deadlines
                </h3>
                ${grantOpportunities.length > 0 ? grantOpportunities.map(opp => {
                    const daysUntil = Math.ceil((new Date(opp.deadline) - new Date()) / (1000 * 60 * 60 * 24));
                    return `
                        <div class="grant-upcoming-item" onclick="openGrantOpportunityModal('${opp.id}')" style="cursor: pointer;">
                            <div>
                                <div class="grant-upcoming-title">${escapeHtml(opp.title)}</div>
                                <div style="font-size: 11px; color: var(--text-muted);">${opp.amount}</div>
                            </div>
                            <span class="grant-upcoming-deadline">${daysUntil}d</span>
                        </div>
                    `;
                }).join('') : '<p class="empty-message">No upcoming deadlines</p>'}
                <button class="dossier-add-btn" onclick="openGrantOpportunityModal()" style="margin-top: 12px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add Opportunity
                </button>
            </div>
        `;

        // Update sidebar badge
        const badge = document.getElementById('grants-badge');
        if (badge) badge.textContent = activeGrants.length;
    }

    window.openGrantModal = function(grantId = null) {
        const grant = grantId ? grants.find(g => g.id === grantId) : null;
        const modal = document.createElement('div');
        modal.className = 'modal-overlay show';
        modal.id = 'grant-modal';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2>${grant ? 'Edit Grant' : 'Add Grant'}</h2>
                    <button class="modal-close" onclick="closeGrantModal()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <form onsubmit="saveGrant(event, '${grantId || ''}')">
                    <div class="form-group">
                        <label>Title</label>
                        <input type="text" id="grant-title" value="${grant ? escapeHtml(grant.title) : ''}" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Agency</label>
                            <input type="text" id="grant-agency" value="${grant ? escapeHtml(grant.agency) : ''}" placeholder="NSF, NIH, etc.">
                        </div>
                        <div class="form-group">
                            <label>Role</label>
                            <select id="grant-role">
                                <option value="PI" ${grant?.role === 'PI' ? 'selected' : ''}>PI</option>
                                <option value="Co-PI" ${grant?.role === 'Co-PI' ? 'selected' : ''}>Co-PI</option>
                                <option value="Senior Personnel" ${grant?.role === 'Senior Personnel' ? 'selected' : ''}>Senior Personnel</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Total Amount ($)</label>
                            <input type="number" id="grant-amount" value="${grant ? grant.amount : ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Spent ($)</label>
                            <input type="number" id="grant-spent" value="${grant ? grant.spent : 0}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Start Date</label>
                            <input type="date" id="grant-start" value="${grant ? grant.startDate : ''}">
                        </div>
                        <div class="form-group">
                            <label>End Date</label>
                            <input type="date" id="grant-end" value="${grant ? grant.endDate : ''}">
                        </div>
                    </div>
                    <div class="modal-actions">
                        ${grant ? `<button type="button" class="btn-danger" onclick="deleteGrant('${grant.id}')">Delete</button>` : ''}
                        <button type="button" class="btn-secondary" onclick="closeGrantModal()">Cancel</button>
                        <button type="submit" class="btn-primary">Save</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    };

    window.closeGrantModal = function() {
        document.getElementById('grant-modal')?.remove();
    };

    window.saveGrant = function(e, grantId) {
        e.preventDefault();
        const grantData = {
            id: grantId || generateId(),
            title: document.getElementById('grant-title').value.trim(),
            agency: document.getElementById('grant-agency').value.trim(),
            role: document.getElementById('grant-role').value,
            amount: parseInt(document.getElementById('grant-amount').value) || 0,
            spent: parseInt(document.getElementById('grant-spent').value) || 0,
            startDate: document.getElementById('grant-start').value,
            endDate: document.getElementById('grant-end').value,
            status: 'active',
            deliverables: grantId ? grants.find(g => g.id === grantId)?.deliverables || [] : []
        };

        if (grantId) {
            const index = grants.findIndex(g => g.id === grantId);
            if (index !== -1) grants[index] = grantData;
        } else {
            grants.push(grantData);
        }

        saveData('grants', grants);
        closeGrantModal();
        renderGrantsView();
        showToast('Grant saved!', 'success');
    };

    window.deleteGrant = function(grantId) {
        if (!confirm('Delete this grant?')) return;
        grants = grants.filter(g => g.id !== grantId);
        saveData('grants', grants);
        closeGrantModal();
        renderGrantsView();
        showToast('Grant deleted', 'success');
    };

    window.openGrantOpportunityModal = function(oppId = null) {
        const opp = oppId ? grantOpportunities.find(o => o.id === oppId) : null;
        const modal = document.createElement('div');
        modal.className = 'modal-overlay show';
        modal.id = 'grant-opp-modal';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2>${opp ? 'Edit Opportunity' : 'Add Grant Opportunity'}</h2>
                    <button class="modal-close" onclick="closeGrantOpportunityModal()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <form onsubmit="saveGrantOpportunity(event, '${oppId || ''}')">
                    <div class="form-group">
                        <label>Title</label>
                        <input type="text" id="grant-opp-title" value="${opp ? escapeHtml(opp.title) : ''}" placeholder="e.g., NSF BIO-OCE" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Deadline</label>
                            <input type="date" id="grant-opp-deadline" value="${opp ? opp.deadline : ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Amount</label>
                            <input type="text" id="grant-opp-amount" value="${opp ? escapeHtml(opp.amount) : ''}" placeholder="e.g., ~$500K">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Notes</label>
                        <input type="text" id="grant-opp-notes" value="${opp ? escapeHtml(opp.notes || '') : ''}" placeholder="Collaboration opportunity">
                    </div>
                    <div class="modal-actions">
                        ${opp ? `<button type="button" class="btn-danger" onclick="deleteGrantOpportunity('${opp.id}')">Delete</button>` : ''}
                        <button type="button" class="btn-secondary" onclick="closeGrantOpportunityModal()">Cancel</button>
                        <button type="submit" class="btn-primary">Save</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    };

    window.closeGrantOpportunityModal = function() {
        document.getElementById('grant-opp-modal')?.remove();
    };

    window.saveGrantOpportunity = function(e, oppId) {
        e.preventDefault();
        const oppData = {
            id: oppId || generateId(),
            title: document.getElementById('grant-opp-title').value.trim(),
            deadline: document.getElementById('grant-opp-deadline').value,
            amount: document.getElementById('grant-opp-amount').value.trim(),
            notes: document.getElementById('grant-opp-notes').value.trim()
        };

        if (oppId) {
            const index = grantOpportunities.findIndex(o => o.id === oppId);
            if (index !== -1) grantOpportunities[index] = oppData;
        } else {
            grantOpportunities.push(oppData);
        }

        saveData('grantOpportunities', grantOpportunities);
        closeGrantOpportunityModal();
        renderGrantsView();
        showToast('Opportunity saved!', 'success');
    };

    window.deleteGrantOpportunity = function(oppId) {
        if (!confirm('Delete this opportunity?')) return;
        grantOpportunities = grantOpportunities.filter(o => o.id !== oppId);
        saveData('grantOpportunities', grantOpportunities);
        closeGrantOpportunityModal();
        renderGrantsView();
        showToast('Opportunity deleted', 'success');
    };

    // ============================================
    // PERSONNEL VIEW
    // ============================================
    function renderPersonnelView() {
        const container = document.getElementById('personnel-content');
        if (!container) return;

        const today = new Date();

        container.innerHTML = personnel.length > 0 ? personnel.map(person => {
            const lastMeetingDate = new Date(person.lastMeeting);
            const daysSinceMeeting = Math.floor((today - lastMeetingDate) / (1000 * 60 * 60 * 24));
            let meetingClass = '';
            if (daysSinceMeeting > 14) meetingClass = 'personnel-last-meeting--danger';
            else if (daysSinceMeeting > 7) meetingClass = 'personnel-last-meeting--warning';

            const initials = person.name.split(' ').map(n => n[0]).join('').substring(0, 2);

            return `
                <div class="personnel-card" onclick="openPersonnelModal('${person.id}')">
                    <div class="personnel-card-header">
                        <div class="personnel-avatar">${initials}</div>
                        <div class="personnel-info">
                            <h4 class="personnel-name">${escapeHtml(person.name)}</h4>
                            <div class="personnel-role">${person.role} - Year ${person.year}</div>
                            <span class="personnel-funding">${escapeHtml(person.funding)}</span>
                        </div>
                    </div>
                    <div class="personnel-milestones">
                        ${(person.milestones || []).slice(0, 2).map(m => {
                            const mDate = new Date(m.date);
                            const isOverdue = mDate < today && !m.done;
                            return `
                                <div class="personnel-milestone ${isOverdue ? 'personnel-milestone--overdue' : ''}">
                                    <span class="personnel-milestone-name">${escapeHtml(m.name)}</span>
                                    <span class="personnel-milestone-date">${mDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div class="personnel-last-meeting ${meetingClass}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        Last 1:1: ${daysSinceMeeting === 0 ? 'Today' : daysSinceMeeting === 1 ? 'Yesterday' : daysSinceMeeting + ' days ago'}
                    </div>
                </div>
            `;
        }).join('') : '<p class="empty-message">No personnel added yet. Click "Add Person" to get started.</p>';

        // Update sidebar badge
        const badge = document.getElementById('personnel-badge');
        if (badge) badge.textContent = personnel.length;
    }

    window.openPersonnelModal = function(personId = null) {
        const person = personId ? personnel.find(p => p.id === personId) : null;
        const modal = document.createElement('div');
        modal.className = 'modal-overlay show';
        modal.id = 'personnel-modal';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2>${person ? 'Edit Person' : 'Add Person'}</h2>
                    <button class="modal-close" onclick="closePersonnelModal()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <form onsubmit="savePersonnel(event, '${personId || ''}')">
                    <div class="form-group">
                        <label>Name</label>
                        <input type="text" id="person-name" value="${person ? escapeHtml(person.name) : ''}" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Role</label>
                            <select id="person-role">
                                <option value="PhD Student" ${person?.role === 'PhD Student' ? 'selected' : ''}>PhD Student</option>
                                <option value="Masters Student" ${person?.role === 'Masters Student' ? 'selected' : ''}>Masters Student</option>
                                <option value="Postdoc" ${person?.role === 'Postdoc' ? 'selected' : ''}>Postdoc</option>
                                <option value="Undergrad" ${person?.role === 'Undergrad' ? 'selected' : ''}>Undergrad</option>
                                <option value="Lab Manager" ${person?.role === 'Lab Manager' ? 'selected' : ''}>Lab Manager</option>
                                <option value="Research Scientist" ${person?.role === 'Research Scientist' ? 'selected' : ''}>Research Scientist</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Year</label>
                            <input type="number" id="person-year" value="${person ? person.year : 1}" min="1" max="10">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Funding Source</label>
                        <input type="text" id="person-funding" value="${person ? escapeHtml(person.funding) : ''}" placeholder="e.g., NSF Grant, TA">
                    </div>
                    <div class="form-group">
                        <label>Last 1:1 Meeting</label>
                        <input type="date" id="person-meeting" value="${person ? person.lastMeeting : formatDateISO(new Date())}">
                    </div>
                    <div class="form-group">
                        <label>Notes</label>
                        <textarea id="person-notes" rows="2">${person ? escapeHtml(person.notes || '') : ''}</textarea>
                    </div>
                    <div class="modal-actions">
                        ${person ? `<button type="button" class="btn-danger" onclick="deletePersonnel('${person.id}')">Delete</button>` : ''}
                        <button type="button" class="btn-secondary" onclick="closePersonnelModal()">Cancel</button>
                        <button type="submit" class="btn-primary">Save</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    };

    window.closePersonnelModal = function() {
        document.getElementById('personnel-modal')?.remove();
    };

    window.savePersonnel = function(e, personId) {
        e.preventDefault();
        const personData = {
            id: personId || generateId(),
            name: document.getElementById('person-name').value.trim(),
            role: document.getElementById('person-role').value,
            year: parseInt(document.getElementById('person-year').value) || 1,
            funding: document.getElementById('person-funding').value.trim(),
            lastMeeting: document.getElementById('person-meeting').value,
            notes: document.getElementById('person-notes').value.trim(),
            milestones: personId ? personnel.find(p => p.id === personId)?.milestones || [] : []
        };

        if (personId) {
            const index = personnel.findIndex(p => p.id === personId);
            if (index !== -1) personnel[index] = personData;
        } else {
            personnel.push(personData);
        }

        saveData('personnel', personnel);
        closePersonnelModal();
        renderPersonnelView();
        showToast('Person saved!', 'success');
    };

    window.deletePersonnel = function(personId) {
        if (!confirm('Remove this person?')) return;
        personnel = personnel.filter(p => p.id !== personId);
        saveData('personnel', personnel);
        closePersonnelModal();
        renderPersonnelView();
        showToast('Person removed', 'success');
    };

    // ============================================
    // TEACHING VIEW
    // ============================================
    function renderTeachingView() {
        const container = document.getElementById('teaching-content');
        if (!container) return;

        const avgEsci = courses.length > 0
            ? (courses.reduce((sum, c) => sum + (c.esci || 0), 0) / courses.length).toFixed(1)
            : '0.0';

        container.innerHTML = `
            <div>
                <div class="teaching-courses">
                    <h3 class="teaching-section-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                        </svg>
                        Courses
                    </h3>
                    ${courses.length > 0 ? courses.map(course => `
                        <div class="course-card" onclick="openCourseModal('${course.id}')">
                            <div class="course-header">
                                <div>
                                    <div class="course-code">${escapeHtml(course.code)}</div>
                                    <div class="course-name">${escapeHtml(course.name)}</div>
                                </div>
                                <span class="course-quarter">${course.quarter}</span>
                            </div>
                            <div class="course-stats">
                                <span class="course-stat">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="9" cy="7" r="4"></circle>
                                    </svg>
                                    ${course.students} students
                                </span>
                                <span class="course-stat">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                    </svg>
                                    ${(course.esci || 0).toFixed(1)} ESCI
                                </span>
                                <span class="course-stat">${course.credits} credits</span>
                            </div>
                        </div>
                    `).join('') : '<p class="empty-message">No courses added yet. Click "Add Course" to get started.</p>'}
                </div>
            </div>
            <div>
                <div class="teaching-evaluations">
                    <h3 class="teaching-section-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="20" x2="18" y2="10"></line>
                            <line x1="12" y1="20" x2="12" y2="4"></line>
                            <line x1="6" y1="20" x2="6" y2="14"></line>
                        </svg>
                        Evaluation Trend
                    </h3>
                    <div style="text-align: center; padding: 20px;">
                        <div style="font-size: 36px; font-weight: 700; color: var(--primary);">${avgEsci}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">Average ESCI Score</div>
                    </div>
                    ${courses.length > 0 ? `
                        <div class="eval-chart">
                            ${courses.slice(-5).map(c => `
                                <div class="eval-bar" style="height: ${((c.esci || 0) / 5) * 100}%">
                                    <span class="eval-bar-value">${(c.esci || 0).toFixed(1)}</span>
                                    <span class="eval-bar-label">${c.code.split(' ')[1] || c.code}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                <div class="teaching-innovations">
                    <h3 class="teaching-section-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                        Innovations Log
                    </h3>
                    ${innovations.length > 0 ? innovations.map(inn => `
                        <div class="innovation-item" onclick="openInnovationModal('${inn.id}')" style="cursor: pointer;">
                            <div class="innovation-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="16" x2="12" y2="12"></line>
                                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                </svg>
                            </div>
                            <div class="innovation-text">
                                <div class="innovation-title">${escapeHtml(inn.title)}</div>
                                <div class="innovation-date">${new Date(inn.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
                            </div>
                        </div>
                    `).join('') : '<p class="empty-message">No innovations logged yet</p>'}
                    <button class="dossier-add-btn" onclick="addInnovation()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Log Innovation
                    </button>
                </div>
            </div>
        `;
    }

    window.openCourseModal = function(courseId = null) {
        const course = courseId ? courses.find(c => c.id === courseId) : null;
        const modal = document.createElement('div');
        modal.className = 'modal-overlay show';
        modal.id = 'course-modal';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2>${course ? 'Edit Course' : 'Add Course'}</h2>
                    <button class="modal-close" onclick="closeCourseModal()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <form onsubmit="saveCourse(event, '${courseId || ''}')">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Course Code</label>
                            <input type="text" id="course-code" value="${course ? escapeHtml(course.code) : ''}" placeholder="BIOL 101" required>
                        </div>
                        <div class="form-group">
                            <label>Quarter/Semester</label>
                            <input type="text" id="course-quarter" value="${course ? escapeHtml(course.quarter) : ''}" placeholder="Fall 2025">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Course Name</label>
                        <input type="text" id="course-name" value="${course ? escapeHtml(course.name) : ''}" placeholder="Introduction to Biology">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Students</label>
                            <input type="number" id="course-students" value="${course ? course.students : ''}" min="1">
                        </div>
                        <div class="form-group">
                            <label>ESCI Score</label>
                            <input type="number" id="course-esci" value="${course ? course.esci : ''}" min="1" max="5" step="0.1">
                        </div>
                        <div class="form-group">
                            <label>Credits</label>
                            <input type="number" id="course-credits" value="${course ? course.credits : 1}" min="0.25" step="0.25">
                        </div>
                    </div>
                    <div class="modal-actions">
                        ${course ? `<button type="button" class="btn-danger" onclick="deleteCourse('${course.id}')">Delete</button>` : ''}
                        <button type="button" class="btn-secondary" onclick="closeCourseModal()">Cancel</button>
                        <button type="submit" class="btn-primary">Save</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    };

    window.closeCourseModal = function() {
        document.getElementById('course-modal')?.remove();
    };

    window.saveCourse = function(e, courseId) {
        e.preventDefault();
        const courseData = {
            id: courseId || generateId(),
            code: document.getElementById('course-code').value.trim(),
            name: document.getElementById('course-name').value.trim(),
            quarter: document.getElementById('course-quarter').value.trim(),
            students: parseInt(document.getElementById('course-students').value) || 0,
            esci: parseFloat(document.getElementById('course-esci').value) || 0,
            credits: parseFloat(document.getElementById('course-credits').value) || 1
        };

        if (courseId) {
            const index = courses.findIndex(c => c.id === courseId);
            if (index !== -1) courses[index] = courseData;
        } else {
            courses.push(courseData);
        }

        saveData('courses', courses);
        closeCourseModal();
        renderTeachingView();
        showToast('Course saved!', 'success');
    };

    window.deleteCourse = function(courseId) {
        if (!confirm('Delete this course?')) return;
        courses = courses.filter(c => c.id !== courseId);
        saveData('courses', courses);
        closeCourseModal();
        renderTeachingView();
        showToast('Course deleted', 'success');
    };

    window.addInnovation = function() {
        const title = prompt('Describe your teaching innovation:');
        if (!title) return;

        innovations.push({
            id: generateId(),
            title: title.trim(),
            date: formatDateISO(new Date())
        });

        saveData('innovations', innovations);
        renderTeachingView();
        showToast('Innovation logged!', 'success');
    };

    window.openInnovationModal = function(innId) {
        const inn = innovations.find(i => i.id === innId);
        if (!inn) return;

        if (confirm('Delete this innovation log?')) {
            innovations = innovations.filter(i => i.id !== innId);
            saveData('innovations', innovations);
            renderTeachingView();
            showToast('Innovation deleted', 'success');
        }
    };

    // ============================================
    // DOSSIER VIEW
    // ============================================
    function renderDossierView() {
        const container = document.getElementById('dossier-content');
        if (!container) return;

        container.innerHTML = `
            <div class="dossier-section">
                <h3>Research</h3>
                <div class="dossier-stat">
                    <span class="dossier-stat-value">${papers.filter(p => p.status === 'published').length}</span>
                    <span class="dossier-stat-label">Published Papers</span>
                </div>
                <div class="dossier-stat">
                    <span class="dossier-stat-value">${papers.filter(p => p.status !== 'published').length}</span>
                    <span class="dossier-stat-label">In Pipeline</span>
                </div>
            </div>
            <div class="dossier-section">
                <h3>Grants</h3>
                <div class="dossier-stat">
                    <span class="dossier-stat-value">${grants.filter(g => g.status === 'active').length}</span>
                    <span class="dossier-stat-label">Active Grants</span>
                </div>
                <div class="dossier-stat">
                    <span class="dossier-stat-value">$${(grants.reduce((sum, g) => sum + g.amount, 0) / 1000000).toFixed(1)}M</span>
                    <span class="dossier-stat-label">Total Funding</span>
                </div>
            </div>
            <div class="dossier-section">
                <h3>Teaching</h3>
                <div class="dossier-stat">
                    <span class="dossier-stat-value">${courses.length}</span>
                    <span class="dossier-stat-label">Courses Taught</span>
                </div>
                <div class="dossier-stat">
                    <span class="dossier-stat-value">${courses.length > 0 ? (courses.reduce((sum, c) => sum + (c.esci || 0), 0) / courses.length).toFixed(1) : '0.0'}</span>
                    <span class="dossier-stat-label">Avg ESCI</span>
                </div>
            </div>
            <div class="dossier-section">
                <h3>Mentoring</h3>
                <div class="dossier-stat">
                    <span class="dossier-stat-value">${personnel.filter(p => p.role === 'PhD Student').length}</span>
                    <span class="dossier-stat-label">PhD Students</span>
                </div>
                <div class="dossier-stat">
                    <span class="dossier-stat-value">${personnel.filter(p => p.role === 'Postdoc').length}</span>
                    <span class="dossier-stat-label">Postdocs</span>
                </div>
            </div>
        `;
    }

    // ============================================
    // TASK CRUD OPERATIONS
    // ============================================
    window.openNewTaskModal = function(status = 'todo') {
        currentTaskId = null;
        document.getElementById('modal-title').textContent = 'New Task';
        document.getElementById('task-form').reset();
        document.getElementById('task-status').value = status;
        document.getElementById('task-modal').classList.add('show');
        document.getElementById('task-title').focus();
    };

    window.closeModal = function() {
        document.getElementById('task-modal').classList.remove('show');
    };

    window.saveTask = function(e) {
        e.preventDefault();

        const taskData = {
            id: currentTaskId || generateId(),
            title: document.getElementById('task-title').value.trim(),
            description: document.getElementById('task-description').value.trim(),
            category: document.getElementById('task-category').value,
            priority: document.getElementById('task-priority').value,
            status: document.getElementById('task-status').value,
            due: document.getElementById('task-due').value,
            notes: document.getElementById('task-notes').value.trim(),
            created: currentTaskId ? tasks.find(t => t.id === currentTaskId)?.created : new Date().toISOString()
        };

        if (currentTaskId) {
            const index = tasks.findIndex(t => t.id === currentTaskId);
            if (index !== -1) tasks[index] = taskData;
            showToast('Task updated!', 'success');
        } else {
            tasks.push(taskData);
            showToast('Task created!', 'success');
        }

        saveData('tasks', tasks);
        closeModal();
        renderTasks();
        updateTodayProgress();
    };

    window.editTask = function(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        currentTaskId = id;
        document.getElementById('modal-title').textContent = 'Edit Task';
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-description').value = task.description || '';
        document.getElementById('task-category').value = task.category;
        document.getElementById('task-priority').value = task.priority;
        document.getElementById('task-status').value = task.status;
        document.getElementById('task-due').value = task.due || '';
        document.getElementById('task-notes').value = task.notes || '';

        closeDetailModal();
        document.getElementById('task-modal').classList.add('show');
    };

    window.deleteTask = function(id) {
        if (!confirm('Are you sure you want to delete this task?')) return;

        tasks = tasks.filter(t => t.id !== id);
        saveData('tasks', tasks);
        closeDetailModal();
        renderTasks();
        showToast('Task deleted', 'success');
    };

    window.toggleTaskDone = function(id, done) {
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.status = done ? 'done' : 'todo';
            task.completedAt = done ? new Date().toISOString() : null;
            if (done) recordCompletion();
            saveData('tasks', tasks);
            renderTasks();
            updateTodayProgress();
            showToast(done ? 'Task completed!' : 'Task reopened', 'success');
        }
    };

    window.clearDoneTasks = function() {
        if (!confirm('Clear all completed tasks?')) return;
        tasks = tasks.filter(t => t.status !== 'done');
        saveData('tasks', tasks);
        renderTasks();
        showToast('Completed tasks cleared', 'success');
    };

    // Task Detail Modal
    window.openTaskDetail = function(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        currentTaskId = id;
        document.getElementById('detail-title').textContent = task.title;

        const dueInfo = getDueInfo(task.due);

        document.getElementById('detail-content').innerHTML = `
            <div class="detail-field">
                <div class="detail-label">Category</div>
                <div class="detail-value">
                    <span class="list-category">
                        <span class="list-category-dot" style="background: ${getCategoryColor(task.category)}"></span>
                        ${categoryLabels[task.category]}
                    </span>
                </div>
            </div>
            <div class="detail-field">
                <div class="detail-label">Priority</div>
                <div class="detail-value">
                    <span class="task-card-priority task-card-priority--${task.priority}">${priorityLabels[task.priority]}</span>
                </div>
            </div>
            <div class="detail-field">
                <div class="detail-label">Status</div>
                <div class="detail-value">
                    <span class="list-status list-status--${task.status}">${statusLabels[task.status]}</span>
                </div>
            </div>
            ${task.due ? `
                <div class="detail-field">
                    <div class="detail-label">Due Date</div>
                    <div class="detail-value ${dueInfo.class}">${dueInfo.text} (${task.due})</div>
                </div>
            ` : ''}
            ${task.description ? `
                <div class="detail-field">
                    <div class="detail-label">Description</div>
                    <div class="detail-description">${escapeHtml(task.description)}</div>
                </div>
            ` : ''}
            ${task.notes ? `
                <div class="detail-field">
                    <div class="detail-label">Notes</div>
                    <div class="detail-description">${escapeHtml(task.notes)}</div>
                </div>
            ` : ''}
        `;

        document.getElementById('detail-modal').classList.add('show');
    };

    window.closeDetailModal = function() {
        document.getElementById('detail-modal').classList.remove('show');
        currentTaskId = null;
    };

    window.editCurrentTask = function() {
        if (currentTaskId) {
            editTask(currentTaskId);
        }
    };

    window.deleteCurrentTask = function() {
        if (currentTaskId) {
            deleteTask(currentTaskId);
        }
    };

    // ============================================
    // QUICK ADD
    // ============================================
    window.handleQuickAddKey = function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitQuickAdd();
        }
    };

    window.submitQuickAdd = function() {
        const input = document.getElementById('quick-add-input');
        const text = input.value.trim();
        if (!text) return;

        const taskData = parseQuickAdd(text);
        tasks.push(taskData);
        saveData('tasks', tasks);

        input.value = '';
        renderTasks();
        updateTodayProgress();
        showToast('Task added!', 'success');
    };

    function parseQuickAdd(text) {
        let title = text;
        let category = 'misc';
        let priority = 'medium';
        let due = '';

        // Parse hashtag categories
        const categoryMap = {
            '#research': 'research',
            '#teaching': 'teaching',
            '#grants': 'grants',
            '#grant': 'grants',
            '#grad': 'grad-mentorship',
            '#undergrad': 'undergrad-mentorship',
            '#admin': 'admin',
            '#service': 'admin',
            '#misc': 'misc'
        };

        for (const [tag, cat] of Object.entries(categoryMap)) {
            if (text.toLowerCase().includes(tag)) {
                category = cat;
                title = title.replace(new RegExp(tag, 'gi'), '').trim();
                break;
            }
        }

        // Parse priority
        const priorityMap = {
            'p1': 'urgent',
            'p2': 'high',
            'p3': 'medium',
            'p4': 'low'
        };

        for (const [tag, pri] of Object.entries(priorityMap)) {
            if (text.toLowerCase().includes(tag)) {
                priority = pri;
                title = title.replace(new RegExp(tag, 'gi'), '').trim();
                break;
            }
        }

        // Parse relative dates
        const today = new Date();
        const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

        if (text.toLowerCase().includes('today')) {
            due = formatDateISO(today);
            title = title.replace(/today/gi, '').trim();
        } else if (text.toLowerCase().includes('tomorrow')) {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            due = formatDateISO(tomorrow);
            title = title.replace(/tomorrow/gi, '').trim();
        } else {
            for (let i = 0; i < dayNames.length; i++) {
                if (text.toLowerCase().includes(dayNames[i])) {
                    const daysUntil = (i - today.getDay() + 7) % 7 || 7;
                    const targetDate = new Date(today);
                    targetDate.setDate(today.getDate() + daysUntil);
                    due = formatDateISO(targetDate);
                    title = title.replace(new RegExp(dayNames[i], 'gi'), '').trim();
                    break;
                }
            }
        }

        return {
            id: generateId(),
            title: title || 'Untitled Task',
            description: '',
            category,
            priority,
            status: 'todo',
            due,
            notes: '',
            created: new Date().toISOString()
        };
    }

    // ============================================
    // SEARCH
    // ============================================
    window.handleSearch = function(query) {
        searchQuery = query;
        renderTasks();
    };

    // ============================================
    // DRAG AND DROP
    // ============================================
    function setupDragAndDrop() {
        const cards = document.querySelectorAll('.task-card');
        const columns = document.querySelectorAll('.column-tasks');

        cards.forEach(card => {
            card.addEventListener('dragstart', handleDragStart);
            card.addEventListener('dragend', handleDragEnd);
        });

        columns.forEach(column => {
            column.addEventListener('dragover', handleDragOver);
            column.addEventListener('dragleave', handleDragLeave);
            column.addEventListener('drop', handleDrop);
        });
    }

    let draggedCard = null;

    function handleDragStart(e) {
        draggedCard = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }

    function handleDragEnd() {
        this.classList.remove('dragging');
        document.querySelectorAll('.column-tasks').forEach(col => {
            col.classList.remove('drag-over');
        });
    }

    function handleDragOver(e) {
        e.preventDefault();
        this.classList.add('drag-over');
    }

    function handleDragLeave() {
        this.classList.remove('drag-over');
    }

    function handleDrop(e) {
        e.preventDefault();
        this.classList.remove('drag-over');

        if (!draggedCard) return;

        const taskId = draggedCard.dataset.id;
        const newStatus = this.id.replace('tasks-', '');

        const task = tasks.find(t => t.id === taskId);
        if (task && task.status !== newStatus) {
            task.status = newStatus;
            if (newStatus === 'done') {
                task.completedAt = new Date().toISOString();
                recordCompletion();
            } else {
                task.completedAt = null;
            }
            saveData('tasks', tasks);
            renderTasks();
            updateTodayProgress();
            showToast(`Moved to ${statusLabels[newStatus]}`, 'success');
        }
    }

    // ============================================
    // STATS UPDATE
    // ============================================
    function updateStats() {
        const todoCount = tasks.filter(t => t.status === 'todo').length;
        const progressCount = tasks.filter(t => t.status === 'progress').length;
        const doneCount = tasks.filter(t => t.status === 'done').length;

        const statTodo = document.getElementById('stat-todo');
        const statProgress = document.getElementById('stat-progress');
        const statDone = document.getElementById('stat-done');

        if (statTodo) statTodo.textContent = todoCount;
        if (statProgress) statProgress.textContent = progressCount;
        if (statDone) statDone.textContent = doneCount;

        // Update category counts
        const countAll = document.getElementById('count-all');
        if (countAll) countAll.textContent = tasks.length;

        Object.keys(categoryLabels).forEach(cat => {
            const el = document.getElementById('count-' + cat);
            if (el) {
                el.textContent = tasks.filter(t => t.category === cat).length;
            }
        });
    }

    // ============================================
    // STREAK TRACKING
    // ============================================
    function loadStreak() {
        const streakData = loadData('streak', { count: 0, lastDate: null });
        const today = formatDateISO(new Date());
        const yesterday = formatDateISO(new Date(Date.now() - 86400000));

        if (streakData.lastDate === yesterday) {
            // Continue streak
        } else if (streakData.lastDate !== today) {
            // Reset streak
            streakData.count = 0;
        }

        updateStreakDisplay(streakData.count);
    }

    function recordCompletion() {
        const streakData = loadData('streak', { count: 0, lastDate: null });
        const today = formatDateISO(new Date());

        if (streakData.lastDate !== today) {
            streakData.count++;
            streakData.lastDate = today;
            saveData('streak', streakData);
        }

        updateStreakDisplay(streakData.count);
    }

    function updateStreakDisplay(count) {
        const el = document.getElementById('streak-count');
        if (el) el.textContent = count;
    }

    // ============================================
    // TOAST NOTIFICATION
    // ============================================
    function showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (!toast) return;

        toast.textContent = message;
        toast.className = 'toast show ' + type;

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Make showToast available globally
    window.showToast = showToast;

    // ============================================
    // MOBILE MENU
    // ============================================
    window.toggleMobileMenu = function() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar && overlay) {
            sidebar.classList.toggle('mobile-open');
            overlay.classList.toggle('show');
            document.body.style.overflow = sidebar.classList.contains('mobile-open') ? 'hidden' : '';
        }
    };

    window.closeMobileMenu = function() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar && overlay) {
            sidebar.classList.remove('mobile-open');
            overlay.classList.remove('show');
            document.body.style.overflow = '';
        }
    };

    window.toggleSidebar = function() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('sidebar--collapsed');
        }
    };

    // ============================================
    // KEYBOARD SHORTCUTS
    // ============================================
    document.addEventListener('keydown', function(e) {
        // Don't trigger if in input/textarea
        if (e.target.matches('input, textarea, select')) return;

        // Escape to close modals
        if (e.key === 'Escape') {
            closeModal();
            closeDetailModal();
        }

        // Q = Focus quick add
        if (e.key === 'q' || e.key === 'Q') {
            e.preventDefault();
            document.getElementById('quick-add-input')?.focus();
        }

        // N = New task modal
        if (e.key === 'n' || e.key === 'N') {
            e.preventDefault();
            openNewTaskModal();
        }

        // 1-5 = Switch views
        if (e.key === '1') switchView('today');
        if (e.key === '2') switchView('upcoming');
        if (e.key === '3') switchView('board');
        if (e.key === '4') switchView('list');
        if (e.key === '5') switchView('calendar');

        // / = Focus search
        if (e.key === '/') {
            e.preventDefault();
            document.getElementById('search-input')?.focus();
        }
    });

    // ============================================
    // INITIALIZE
    // ============================================
    init();

})();
