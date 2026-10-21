/**
 * TaskFlow Frontend Application Logic
 * Communicates with the Express + MongoDB Task Manager API on http://localhost:5000
 */

const API_BASE_URL = 'http://localhost:5000/api/tasks';
const HEALTH_URL = 'http://localhost:5000/';

// Application State
const state = {
  tasks: [],
  isLoading: true,
  statusFilter: 'all',
  priorityFilter: 'all',
  searchQuery: '',
  taskToDelete: null,
};

// DOM Elements
const elements = {
  // Status
  statusDot: document.getElementById('statusDot'),
  statusText: document.getElementById('statusText'),

  // Stats
  statTotal: document.getElementById('statTotal'),
  statPending: document.getElementById('statPending'),
  statCompleted: document.getElementById('statCompleted'),
  statHigh: document.getElementById('statHigh'),

  // Toolbar
  searchInput: document.getElementById('searchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  statusFilterTabs: document.getElementById('statusFilterTabs'),
  priorityFilterSelect: document.getElementById('priorityFilterSelect'),

  // Tasks List & States
  loadingState: document.getElementById('loadingState'),
  emptyState: document.getElementById('emptyState'),
  emptyStateTitle: document.getElementById('emptyStateTitle'),
  emptyStateDesc: document.getElementById('emptyStateDesc'),
  emptyStateCreateBtn: document.getElementById('emptyStateCreateBtn'),
  tasksGrid: document.getElementById('tasksGrid'),

  // Create / Edit Modal
  btnOpenCreateModal: document.getElementById('btnOpenCreateModal'),
  taskModal: document.getElementById('taskModal'),
  modalTitle: document.getElementById('modalTitle'),
  modalCloseBtn: document.getElementById('modalCloseBtn'),
  modalCancelBtn: document.getElementById('modalCancelBtn'),
  taskForm: document.getElementById('taskForm'),
  taskIdInput: document.getElementById('taskIdInput'),
  taskTitleInput: document.getElementById('taskTitleInput'),
  taskDescInput: document.getElementById('taskDescInput'),
  taskPriorityInput: document.getElementById('taskPriorityInput'),
  taskDueDateInput: document.getElementById('taskDueDateInput'),
  completedGroup: document.getElementById('completedGroup'),
  taskCompletedInput: document.getElementById('taskCompletedInput'),
  modalSubmitBtn: document.getElementById('modalSubmitBtn'),
  modalSubmitText: document.getElementById('modalSubmitText'),
  titleError: document.getElementById('titleError'),

  // Delete Modal
  deleteModal: document.getElementById('deleteModal'),
  deleteTaskTitle: document.getElementById('deleteTaskTitle'),
  cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
  confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),

  // Toast Container
  toastContainer: document.getElementById('toastContainer'),
};

// ==========================================================================
// Initialization & Backend Health Check
// ==========================================================================

async function init() {
  bindEvents();
  await checkBackendHealth();
  await fetchTasks();

  // Poll backend health every 15 seconds
  setInterval(checkBackendHealth, 15000);

  // If ?modal=1 is in URL, open modal for preview
  if (new URLSearchParams(window.location.search).get('modal')) {
    openCreateModal();
  }
}

async function checkBackendHealth() {
  try {
    const res = await fetch(HEALTH_URL, { method: 'GET' });
    if (res.ok) {
      elements.statusDot.className = 'status-dot online';
      elements.statusText.textContent = 'Backend Connected';
    } else {
      throw new Error('Non-200 response');
    }
  } catch (err) {
    elements.statusDot.className = 'status-dot offline';
    elements.statusText.textContent = 'Backend Offline';
  }
}

// ==========================================================================
// API Operations
// ==========================================================================

async function fetchTasks() {
  try {
    elements.loadingState.style.display = 'grid';
    elements.tasksGrid.innerHTML = '';
    elements.emptyState.style.display = 'none';

    const res = await fetch(API_BASE_URL);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const result = await res.json();
    state.tasks = result.data || [];
    render();
  } catch (err) {
    console.error('Failed to fetch tasks:', err);
    showToast('Could not load tasks. Ensure backend is running.', 'error');
  } finally {
    elements.loadingState.style.display = 'none';
  }
}

async function saveTask(e) {
  e.preventDefault();
  elements.titleError.textContent = '';

  const title = elements.taskTitleInput.value.trim();
  const description = elements.taskDescInput.value.trim();
  const priority = elements.taskPriorityInput.value;
  const dueDate = elements.taskDueDateInput.value || null;
  const isEditing = Boolean(elements.taskIdInput.value);

  // Client-side validation
  if (!title) {
    elements.titleError.textContent = 'Task title is required.';
    elements.taskTitleInput.focus();
    return;
  }

  const payload = {
    title,
    description,
    priority,
    dueDate,
  };

  if (isEditing) {
    payload.completed = elements.taskCompletedInput.checked;
  }

  elements.modalSubmitBtn.disabled = true;
  elements.modalSubmitText.textContent = isEditing ? 'Updating...' : 'Creating...';

  try {
    const url = isEditing ? `${API_BASE_URL}/${elements.taskIdInput.value}` : API_BASE_URL;
    const method = isEditing ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.message || 'Operation failed');
    }

    showToast(isEditing ? 'Task updated successfully!' : 'Task created successfully!', 'success');
    closeTaskModal();
    await fetchTasks();
  } catch (err) {
    console.error('Failed to save task:', err);
    showToast(err.message, 'error');
  } finally {
    elements.modalSubmitBtn.disabled = false;
    elements.modalSubmitText.textContent = isEditing ? 'Update Task' : 'Create Task';
  }
}

async function toggleTaskCompletion(task, checkbox) {
  const newCompleted = checkbox.checked;
  const prevCompleted = task.completed;

  // Optimistic UI update
  task.completed = newCompleted;
  render();

  try {
    const res = await fetch(`${API_BASE_URL}/${task._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: newCompleted }),
    });

    if (!res.ok) {
      const result = await res.json();
      throw new Error(result.message || 'Failed to update task');
    }

    showToast(newCompleted ? 'Task marked as completed' : 'Task marked as pending', 'success');
  } catch (err) {
    // Revert optimistic update
    task.completed = prevCompleted;
    render();
    showToast(err.message, 'error');
  }
}

async function deleteTaskConfirmed() {
  if (!state.taskToDelete) return;

  const id = state.taskToDelete._id;
  elements.confirmDeleteBtn.disabled = true;
  elements.confirmDeleteBtn.textContent = 'Deleting...';

  try {
    const res = await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' });
    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.message || 'Failed to delete task');
    }

    showToast('Task deleted successfully', 'success');
    closeDeleteModal();
    await fetchTasks();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    elements.confirmDeleteBtn.disabled = false;
    elements.confirmDeleteBtn.textContent = 'Delete';
  }
}

// ==========================================================================
// Rendering & Filtering Logic
// ==========================================================================

function render() {
  updateStats();

  const filteredTasks = getFilteredTasks();

  if (filteredTasks.length === 0) {
    elements.tasksGrid.innerHTML = '';
    elements.emptyState.style.display = 'block';

    if (state.tasks.length === 0) {
      elements.emptyStateTitle.textContent = 'No tasks yet';
      elements.emptyStateDesc.textContent = 'Get started by creating your first task using the "New Task" button above.';
      elements.emptyStateCreateBtn.style.display = 'inline-flex';
    } else {
      elements.emptyStateTitle.textContent = 'No matching tasks found';
      elements.emptyStateDesc.textContent = 'Try adjusting your search keywords or filter options.';
      elements.emptyStateCreateBtn.style.display = 'none';
    }
    return;
  }

  elements.emptyState.style.display = 'none';
  elements.tasksGrid.innerHTML = filteredTasks.map(renderTaskCard).join('');
}

function updateStats() {
  const total = state.tasks.length;
  const completed = state.tasks.filter((t) => t.completed).length;
  const pending = total - completed;
  const high = state.tasks.filter((t) => t.priority === 'high' && !t.completed).length;

  elements.statTotal.textContent = total;
  elements.statCompleted.textContent = completed;
  elements.statPending.textContent = pending;
  elements.statHigh.textContent = high;
}

function getFilteredTasks() {
  return state.tasks.filter((task) => {
    // Status Filter
    if (state.statusFilter === 'pending' && task.completed) return false;
    if (state.statusFilter === 'completed' && !task.completed) return false;

    // Priority Filter
    if (state.priorityFilter !== 'all' && task.priority !== state.priorityFilter) return false;

    // Search Query
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      const matchTitle = (task.title || '').toLowerCase().includes(q);
      const matchDesc = (task.description || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }

    return true;
  });
}

function renderTaskCard(task) {
  const priorityClass = `priority-${task.priority || 'medium'}`;
  const isCompletedClass = task.completed ? 'is-completed' : '';

  let dueDateMarkup = '';
  if (task.dueDate) {
    const dueDate = new Date(task.dueDate);
    const isOverdue = !task.completed && dueDate < new Date();
    const formattedDate = dueDate.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    dueDateMarkup = `
      <span class="due-date-tag ${isOverdue ? 'overdue' : ''}" title="${isOverdue ? 'Overdue!' : 'Due Date'}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        ${formattedDate}
      </span>
    `;
  }

  return `
    <div class="task-card ${priorityClass} ${isCompletedClass}" data-id="${task._id}">
      <div>
        <div class="task-card-header">
          <label class="task-checkbox-wrap" title="Toggle completion">
            <input 
              type="checkbox" 
              class="task-checkbox" 
              data-id="${task._id}"
              ${task.completed ? 'checked' : ''}
              onchange="window.handleToggleCompletion('${task._id}', this)"
            >
            <span class="checkbox-custom"></span>
          </label>
          <div class="task-title-area">
            <h3 class="task-title">${escapeHTML(task.title)}</h3>
          </div>
        </div>

        ${task.description ? `<p class="task-description">${escapeHTML(task.description)}</p>` : ''}
      </div>

      <div class="task-card-footer">
        <div class="task-meta">
          <span class="badge badge-${task.priority}">
            ${task.priority}
          </span>
          ${dueDateMarkup}
        </div>

        <div class="task-actions">
          <button 
            class="action-icon-btn edit-btn" 
            title="Edit task"
            onclick="window.handleEditTask('${task._id}')"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button 
            class="action-icon-btn delete-btn" 
            title="Delete task"
            onclick="window.handleOpenDelete('${task._id}')"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

// ==========================================================================
// Modal Handlers
// ==========================================================================

function openCreateModal() {
  elements.modalTitle.textContent = 'Create New Task';
  elements.modalSubmitText.textContent = 'Create Task';
  elements.taskForm.reset();
  elements.taskIdInput.value = '';
  elements.completedGroup.style.display = 'none';
  elements.titleError.textContent = '';
  elements.taskModal.style.display = 'flex';
  elements.taskTitleInput.focus();
}

function openEditModal(task) {
  elements.modalTitle.textContent = 'Edit Task';
  elements.modalSubmitText.textContent = 'Save Changes';
  elements.taskIdInput.value = task._id;
  elements.taskTitleInput.value = task.title || '';
  elements.taskDescInput.value = task.description || '';
  elements.taskPriorityInput.value = task.priority || 'medium';
  elements.taskCompletedInput.checked = Boolean(task.completed);
  elements.completedGroup.style.display = 'block';
  elements.titleError.textContent = '';

  if (task.dueDate) {
    const d = new Date(task.dueDate);
    elements.taskDueDateInput.value = d.toISOString().split('T')[0];
  } else {
    elements.taskDueDateInput.value = '';
  }

  elements.taskModal.style.display = 'flex';
  elements.taskTitleInput.focus();
}

function closeTaskModal() {
  elements.taskModal.style.display = 'none';
}

function openDeleteModal(task) {
  state.taskToDelete = task;
  elements.deleteTaskTitle.textContent = `"${task.title}"`;
  elements.deleteModal.style.display = 'flex';
}

function closeDeleteModal() {
  state.taskToDelete = null;
  elements.deleteModal.style.display = 'none';
}

// ==========================================================================
// Toast Notification
// ==========================================================================

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconSvg = type === 'success'
    ? `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    : `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

  toast.innerHTML = `
    ${iconSvg}
    <span class="toast-message">${escapeHTML(message)}</span>
  `;

  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Utility: Escape HTML to avoid XSS
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================================================
// Event Listeners
// ==========================================================================

function bindEvents() {
  // Modal buttons
  elements.btnOpenCreateModal.addEventListener('click', openCreateModal);
  elements.emptyStateCreateBtn.addEventListener('click', openCreateModal);
  elements.modalCloseBtn.addEventListener('click', closeTaskModal);
  elements.modalCancelBtn.addEventListener('click', closeTaskModal);
  elements.taskForm.addEventListener('submit', saveTask);

  // Delete modal
  elements.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
  elements.confirmDeleteBtn.addEventListener('click', deleteTaskConfirmed);

  // Close modals on backdrop click
  elements.taskModal.addEventListener('click', (e) => {
    if (e.target === elements.taskModal) closeTaskModal();
  });
  elements.deleteModal.addEventListener('click', (e) => {
    if (e.target === elements.deleteModal) closeDeleteModal();
  });

  // Keyboard shortcut (Escape)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeTaskModal();
      closeDeleteModal();
    }
  });

  // Search input
  elements.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    elements.clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';
    render();
  });

  elements.clearSearchBtn.addEventListener('click', () => {
    elements.searchInput.value = '';
    state.searchQuery = '';
    elements.clearSearchBtn.style.display = 'none';
    render();
  });

  // Filter tabs (All, Pending, Completed)
  elements.statusFilterTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.filter-tab');
    if (!tab) return;

    document.querySelectorAll('.filter-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');

    state.statusFilter = tab.dataset.status;
    render();
  });

  // Priority select filter
  elements.priorityFilterSelect.addEventListener('change', (e) => {
    state.priorityFilter = e.target.value;
    render();
  });

  // Window bridge for inline card action handlers
  window.handleToggleCompletion = (id, checkbox) => {
    const task = state.tasks.find((t) => t._id === id);
    if (task) toggleTaskCompletion(task, checkbox);
  };

  window.handleEditTask = (id) => {
    const task = state.tasks.find((t) => t._id === id);
    if (task) openEditModal(task);
  };

  window.handleOpenDelete = (id) => {
    const task = state.tasks.find((t) => t._id === id);
    if (task) openDeleteModal(task);
  };
}

// Start application
document.addEventListener('DOMContentLoaded', init);
