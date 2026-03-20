const projectForm = document.getElementById('projectForm');
const projectsContainer = document.getElementById('projects');
const messageEl = document.getElementById('message');

function showMessage(text, type = 'success') {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
}

function clearMessage() {
  messageEl.textContent = '';
  messageEl.className = 'message';
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    let errorText = 'Request failed';
    try {
      const data = await response.json();
      errorText = data.message || data.error || errorText;
    } catch (_) {
      errorText = response.statusText;
    }

    throw new Error(errorText);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function projectCardTemplate(project) {
  return `
    <article class="project-card" data-id="${project.id}">
      <div class="project-title">
        <strong>${project.name}</strong>
        <span>#${project.id}</span>
      </div>

      <p>${project.description || 'No description yet.'}</p>
      <div class="project-meta">
        Status: ${project.status} | Progress: ${project.progress}%
      </div>

      <div class="inline-group">
        <select data-field="status">
          <option value="planned" ${project.status === 'planned' ? 'selected' : ''}>Planned</option>
          <option value="in-progress" ${project.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
          <option value="blocked" ${project.status === 'blocked' ? 'selected' : ''}>Blocked</option>
          <option value="done" ${project.status === 'done' ? 'selected' : ''}>Done</option>
        </select>

        <input data-field="progress" type="number" min="0" max="100" value="${project.progress}" />
      </div>

      <div class="inline-group">
        <input data-field="sourceUrl" type="url" placeholder="Source URL" value="${project.sourceUrl || ''}" />
        <button class="secondary" data-action="clone">Clone Website</button>
      </div>

      <div class="inline-group">
        <input data-field="repositoryUrl" type="url" placeholder="Repository URL" value="${project.repositoryUrl || ''}" />
      </div>

      <div class="project-actions">
        <button data-action="save">Update</button>
        <button class="danger" data-action="delete">Delete</button>
      </div>

      <div class="small">Cloned path: ${project.clonedPath || 'Not cloned yet'}</div>
      <div class="small">Last update: ${new Date(project.updatedAt).toLocaleString()}</div>
    </article>
  `;
}

async function loadProjects() {
  const projects = await apiRequest('/api/projects');

  if (!projects.length) {
    projectsContainer.innerHTML = '<p>No projects yet.</p>';
    return;
  }

  projectsContainer.innerHTML = projects.map(projectCardTemplate).join('');
}

projectForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage();

  const formData = new FormData(projectForm);
  const payload = {
    name: formData.get('name')?.toString().trim(),
    description: formData.get('description')?.toString().trim(),
    status: formData.get('status')?.toString(),
    progress: Number(formData.get('progress') || 0),
    sourceUrl: formData.get('sourceUrl')?.toString().trim(),
    repositoryUrl: formData.get('repositoryUrl')?.toString().trim()
  };

  try {
    await apiRequest('/api/projects', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    projectForm.reset();
    showMessage('Project saved.');
    await loadProjects();
  } catch (error) {
    showMessage(error.message, 'error');
  }
});

projectsContainer.addEventListener('click', async (event) => {
  const target = event.target;
  const card = target.closest('.project-card');
  if (!target || !card) return;

  const projectId = card.dataset.id;
  const status = card.querySelector('[data-field="status"]').value;
  const progress = Number(card.querySelector('[data-field="progress"]').value || 0);
  const sourceUrl = card.querySelector('[data-field="sourceUrl"]').value.trim();
  const repositoryUrl = card.querySelector('[data-field="repositoryUrl"]').value.trim();
  const name = card.querySelector('.project-title strong').textContent;
  const description = card.querySelector('p').textContent;

  const action = target.dataset.action;
  if (!action) return;

  clearMessage();

  try {
    if (action === 'save') {
      await apiRequest(`/api/projects/${projectId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name,
          description,
          status,
          progress,
          sourceUrl,
          repositoryUrl
        })
      });

      showMessage(`Project #${projectId} updated.`);
      await loadProjects();
      return;
    }

    if (action === 'clone') {
      if (!sourceUrl) {
        showMessage('Enter a source URL first.', 'error');
        return;
      }

      target.disabled = true;
      target.textContent = 'Cloning...';

      await apiRequest(`/api/projects/${projectId}/clone`, {
        method: 'POST',
        body: JSON.stringify({ url: sourceUrl })
      });

      showMessage(`Clone completed for project #${projectId}.`);
      await loadProjects();
      return;
    }

    if (action === 'delete') {
      const confirmed = window.confirm('Delete this project?');
      if (!confirmed) return;

      await apiRequest(`/api/projects/${projectId}`, {
        method: 'DELETE'
      });

      showMessage(`Project #${projectId} deleted.`);
      await loadProjects();
    }
  } catch (error) {
    showMessage(error.message, 'error');
  } finally {
    if (action === 'clone') {
      target.disabled = false;
      target.textContent = 'Clone Website';
    }
  }
});

loadProjects().catch((error) => {
  showMessage(error.message, 'error');
});
