const tasksEl = document.getElementById('tasks');
const loadingEl = document.getElementById('loading');
const emptyEl = document.getElementById('empty');
const errorEl = document.getElementById('error');
const form = document.getElementById('task-form');
const formMessage = document.getElementById('form-message');

function showMessage(el, text, type) {
  el.textContent = text;
  el.className = 'message ' + (type || '');
  el.hidden = false;
}

function clearMessage(el) {
  el.textContent = '';
  el.className = 'message';
  el.hidden = true;
}

function setLoading(show) {
  loadingEl.hidden = !show;
  if (show) {
    emptyEl.hidden = true;
    errorEl.hidden = true;
  }
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function renderTask(task) {
  const li = document.createElement('li');
  li.innerHTML = `
    <div class="task-title">${escapeHtml(task.title)}</div>
    ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
    <div class="task-meta">
      <span class="task-status">${escapeHtml(task.status || 'pending')}</span>
      <span>${formatDate(task.created_at)}</span>
    </div>
  `;
  return li;
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function renderTasks(tasks) {
  tasksEl.innerHTML = '';
  loadingEl.hidden = true;
  errorEl.hidden = true;

  if (!tasks || tasks.length === 0) {
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;
  tasks.forEach((task) => tasksEl.appendChild(renderTask(task)));
}

async function loadTasks() {
  setLoading(true);
  try {
    const res = await fetch('/tasks');
    if (!res.ok) throw new Error('Failed to load tasks');
    const data = await res.json();
    renderTasks(data.tasks || []);
  } catch (err) {
    loadingEl.hidden = true;
    emptyEl.hidden = true;
    errorEl.textContent = err.message || 'Could not load tasks. Is the API running?';
    errorEl.hidden = false;
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessage(formMessage);
  const title = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  if (!title) return;

  const btn = form.querySelector('button');
  btn.disabled = true;
  try {
    const res = await fetch('/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: description || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showMessage(formMessage, data.message || data.error || 'Failed to add task', 'error');
      return;
    }
    showMessage(formMessage, 'Task added.', 'success');
    form.reset();
    loadTasks();
  } catch (err) {
    showMessage(formMessage, err.message || 'Network error', 'error');
  } finally {
    btn.disabled = false;
  }
});

loadTasks();