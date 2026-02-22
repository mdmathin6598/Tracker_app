async function loadTasks() {
  const loading = document.getElementById('loading');
  const tasksList = document.getElementById('tasks');
  const empty = document.getElementById('empty');
  const errorDiv = document.getElementById('error');

  try {
    const response = await fetch('/tasks');
    const data = await response.json();

    loading.hidden = true;
    tasksList.innerHTML = '';

    if (!data.tasks || data.tasks.length === 0) {
      empty.hidden = false;
      return;
    }

    empty.hidden = true;

    data.tasks.forEach(task => {
      const li = document.createElement('li');
      li.textContent = `${task.title} (${task.status})`;
      tasksList.appendChild(li);
    });
  } catch (err) {
    loading.hidden = true;
    errorDiv.hidden = false;
    errorDiv.textContent = 'Failed to load tasks.';
  }
}

document.getElementById('task-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = document.getElementById('title').value;
  const description = document.getElementById('description').value;
  const message = document.getElementById('form-message');

  try {
    const response = await fetch('/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description })
    });

    if (!response.ok) {
      const err = await response.json();
      message.textContent = err.error || 'Failed to add task';
      return;
    }

    document.getElementById('task-form').reset();
    message.textContent = 'Task added!';
    loadTasks();
  } catch (err) {
    message.textContent = 'Error adding task.';
  }
});

loadTasks();