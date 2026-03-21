import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const STORAGE_KEYS = {
  url: 'dspm_supabase_url',
  key: 'dspm_supabase_anon_key'
};

const configForm = document.getElementById('configForm');
const departmentForm = document.getElementById('departmentForm');
const initiativeForm = document.getElementById('initiativeForm');
const projectForm = document.getElementById('projectForm');

const departmentsContainer = document.getElementById('departments');
const initiativesContainer = document.getElementById('initiatives');
const projectsContainer = document.getElementById('projects');

const messageEl = document.getElementById('message');
const supabaseUrlInput = document.getElementById('supabaseUrl');
const supabaseAnonKeyInput = document.getElementById('supabaseAnonKey');
const initiativeDepartmentIdInput = document.getElementById('initiativeDepartmentId');

let supabase = null;

function showMessage(text, type = 'success') {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
}

function clearMessage() {
  messageEl.textContent = '';
  messageEl.className = 'message';
}

function sanitizeText(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function getSavedConfig() {
  return {
    url: localStorage.getItem(STORAGE_KEYS.url) || '',
    key: localStorage.getItem(STORAGE_KEYS.key) || ''
  };
}

function saveConfig(url, key) {
  localStorage.setItem(STORAGE_KEYS.url, url);
  localStorage.setItem(STORAGE_KEYS.key, key);
}

function connectSupabase() {
  const { url, key } = getSavedConfig();
  if (!url || !key) {
    supabase = null;
    return false;
  }

  supabase = createClient(url, key);
  return true;
}

function departmentCardTemplate(department) {
  return `
    <article class="project-card" data-id="${department.id}" data-type="department">
      <strong>${sanitizeText(department.name)}</strong>
      <p>${sanitizeText(department.description || 'No description')}</p>
      <div class="small">Lead: ${sanitizeText(department.lead || 'Not set')}</div>
      <div class="inline-group">
        <input data-field="name" value="${sanitizeText(department.name)}" placeholder="Department name" />
        <input data-field="lead" value="${sanitizeText(department.lead || '')}" placeholder="Department lead" />
      </div>
      <div class="inline-group">
        <input data-field="description" value="${sanitizeText(department.description || '')}" placeholder="Description" />
      </div>
      <div class="project-actions">
        <button data-action="save-department">Update</button>
        <button class="danger" data-action="delete-department">Delete</button>
      </div>
      <div class="small">Updated: ${new Date(department.updated_at).toLocaleString()}</div>
    </article>
  `;
}

function initiativeCardTemplate(initiative) {
  return `
    <article class="project-card" data-id="${initiative.id}" data-type="initiative">
      <strong>${sanitizeText(initiative.name)}</strong>
      <p>${sanitizeText(initiative.description || 'No description')}</p>
      <div class="small">
        Department: ${sanitizeText(initiative.departments?.name || 'Unknown')} |
        Owner: ${sanitizeText(initiative.owner || 'Not set')} |
        Status: ${sanitizeText(initiative.status)} |
        Progress: ${initiative.progress}%
      </div>
      <div class="inline-group">
        <select data-field="department_id" data-current="${initiative.department_id}"></select>
        <input data-field="owner" value="${sanitizeText(initiative.owner || '')}" placeholder="Owner" />
      </div>
      <div class="inline-group">
        <select data-field="status">
          <option value="planned" ${initiative.status === 'planned' ? 'selected' : ''}>Planned</option>
          <option value="in-progress" ${initiative.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
          <option value="blocked" ${initiative.status === 'blocked' ? 'selected' : ''}>Blocked</option>
          <option value="done" ${initiative.status === 'done' ? 'selected' : ''}>Done</option>
        </select>
        <input data-field="progress" type="number" min="0" max="100" value="${initiative.progress}" />
      </div>
      <div class="inline-group">
        <input data-field="description" value="${sanitizeText(initiative.description || '')}" placeholder="Description" />
      </div>
      <div class="project-actions">
        <button data-action="save-initiative">Update</button>
        <button class="danger" data-action="delete-initiative">Delete</button>
      </div>
      <div class="small">Updated: ${new Date(initiative.updated_at).toLocaleString()}</div>
    </article>
  `;
}

function projectCardTemplate(project) {
  return `
    <article class="project-card" data-id="${project.id}" data-type="project">
      <strong>${sanitizeText(project.name)}</strong>
      <p>${sanitizeText(project.description || 'No description')}</p>
      <div class="small">Status: ${sanitizeText(project.status)} | Progress: ${project.progress}%</div>

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
        <input data-field="source_url" type="url" placeholder="Source URL" value="${sanitizeText(project.source_url || '')}" />
        <input data-field="repository_url" type="url" placeholder="Repository URL" value="${sanitizeText(project.repository_url || '')}" />
      </div>

      <div class="inline-group">
        <input data-field="clone_notes" placeholder="Clone notes" value="${sanitizeText(project.clone_notes || '')}" />
      </div>

      <div class="project-actions">
        <button data-action="save-project">Update</button>
        <button class="danger" data-action="delete-project">Delete</button>
      </div>

      <div class="small">Updated: ${new Date(project.updated_at).toLocaleString()}</div>
    </article>
  `;
}

function renderDepartmentOptions(selectElement, departments, currentValue = '') {
  const options = [
    '<option value="">Select department</option>',
    ...departments.map((department) => {
      const selected = String(currentValue) === String(department.id) ? 'selected' : '';
      return `<option value="${department.id}" ${selected}>${sanitizeText(department.name)}</option>`;
    })
  ];

  selectElement.innerHTML = options.join('');
}

async function loadDepartments() {
  if (!supabase) {
    departmentsContainer.innerHTML = '<p class="small">Connect Supabase to load departments.</p>';
    return [];
  }

  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    showMessage(error.message, 'error');
    return [];
  }

  if (!data?.length) {
    departmentsContainer.innerHTML = '<p class="small">No departments yet.</p>';
  } else {
    departmentsContainer.innerHTML = data.map(departmentCardTemplate).join('');
  }

  renderDepartmentOptions(initiativeDepartmentIdInput, data || []);
  return data || [];
}

async function loadInitiatives(departments) {
  if (!supabase) {
    initiativesContainer.innerHTML = '<p class="small">Connect Supabase to load initiatives.</p>';
    return;
  }

  const { data, error } = await supabase
    .from('initiatives')
    .select('*, departments(name)')
    .order('created_at', { ascending: false });

  if (error) {
    showMessage(error.message, 'error');
    return;
  }

  if (!data?.length) {
    initiativesContainer.innerHTML = '<p class="small">No initiatives yet.</p>';
  } else {
    initiativesContainer.innerHTML = data.map(initiativeCardTemplate).join('');

    initiativesContainer.querySelectorAll('select[data-field="department_id"]').forEach((selectEl) => {
      renderDepartmentOptions(selectEl, departments, selectEl.dataset.current || '');
    });
  }
}

async function loadProjects() {
  if (!supabase) {
    projectsContainer.innerHTML = '<p class="small">Connect Supabase to load projects.</p>';
    return;
  }

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    showMessage(error.message, 'error');
    return;
  }

  if (!data?.length) {
    projectsContainer.innerHTML = '<p class="small">No projects yet.</p>';
    return;
  }

  projectsContainer.innerHTML = data.map(projectCardTemplate).join('');
}

async function loadAllData() {
  const departments = await loadDepartments();
  await loadInitiatives(departments);
  await loadProjects();
}

configForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage();

  const url = supabaseUrlInput.value.trim();
  const key = supabaseAnonKeyInput.value.trim();

  if (!url || !key) {
    showMessage('Supabase URL and anon key are required.', 'error');
    return;
  }

  saveConfig(url, key);
  const connected = connectSupabase();

  if (!connected) {
    showMessage('Failed to connect Supabase.', 'error');
    return;
  }

  showMessage('Supabase connected.');
  await loadAllData();
});

departmentForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage();

  if (!supabase) {
    showMessage('Connect Supabase first.', 'error');
    return;
  }

  const formData = new FormData(departmentForm);
  const payload = {
    name: String(formData.get('name') || '').trim(),
    lead: String(formData.get('lead') || '').trim(),
    description: String(formData.get('description') || '').trim(),
    updated_at: new Date().toISOString()
  };

  if (!payload.name) {
    showMessage('Department name is required.', 'error');
    return;
  }

  const { error } = await supabase.from('departments').insert([payload]);
  if (error) {
    showMessage(error.message, 'error');
    return;
  }

  departmentForm.reset();
  showMessage('Department saved.');
  await loadAllData();
});

initiativeForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage();

  if (!supabase) {
    showMessage('Connect Supabase first.', 'error');
    return;
  }

  const formData = new FormData(initiativeForm);
  const departmentId = Number(formData.get('department_id'));

  const payload = {
    name: String(formData.get('name') || '').trim(),
    department_id: departmentId,
    owner: String(formData.get('owner') || '').trim(),
    status: String(formData.get('status') || 'planned'),
    progress: Math.max(0, Math.min(100, Number(formData.get('progress') || 0))),
    description: String(formData.get('description') || '').trim(),
    updated_at: new Date().toISOString()
  };

  if (!payload.name) {
    showMessage('Initiative name is required.', 'error');
    return;
  }

  if (!payload.department_id) {
    showMessage('Select a department for this initiative.', 'error');
    return;
  }

  const { error } = await supabase.from('initiatives').insert([payload]);
  if (error) {
    showMessage(error.message, 'error');
    return;
  }

  initiativeForm.reset();
  showMessage('Initiative saved.');
  await loadAllData();
});

projectForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage();

  if (!supabase) {
    showMessage('Connect Supabase first.', 'error');
    return;
  }

  const formData = new FormData(projectForm);
  const payload = {
    name: String(formData.get('name') || '').trim(),
    description: String(formData.get('description') || '').trim(),
    status: String(formData.get('status') || 'planned'),
    progress: Math.max(0, Math.min(100, Number(formData.get('progress') || 0))),
    source_url: String(formData.get('source_url') || '').trim(),
    repository_url: String(formData.get('repository_url') || '').trim(),
    clone_notes: String(formData.get('clone_notes') || '').trim(),
    updated_at: new Date().toISOString()
  };

  if (!payload.name) {
    showMessage('Project name is required.', 'error');
    return;
  }

  const { error } = await supabase.from('projects').insert([payload]);
  if (error) {
    showMessage(error.message, 'error');
    return;
  }

  projectForm.reset();
  showMessage('Project saved.');
  await loadAllData();
});

departmentsContainer.addEventListener('click', async (event) => {
  const target = event.target;
  const card = target.closest('.project-card');
  if (!target || !card || !supabase) return;

  const action = target.dataset.action;
  if (!action) return;

  const id = card.dataset.id;

  if (action === 'delete-department') {
    const confirmed = window.confirm('Delete this department? (Initiatives linked to it must be removed first.)');
    if (!confirmed) return;

    const { error } = await supabase.from('departments').delete().eq('id', id);
    if (error) {
      showMessage(error.message, 'error');
      return;
    }

    showMessage('Department deleted.');
    await loadAllData();
    return;
  }

  if (action === 'save-department') {
    const name = card.querySelector('[data-field="name"]').value.trim();
    const lead = card.querySelector('[data-field="lead"]').value.trim();
    const description = card.querySelector('[data-field="description"]').value.trim();

    if (!name) {
      showMessage('Department name is required.', 'error');
      return;
    }

    const { error } = await supabase
      .from('departments')
      .update({ name, lead, description, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      showMessage(error.message, 'error');
      return;
    }

    showMessage('Department updated.');
    await loadAllData();
  }
});

initiativesContainer.addEventListener('click', async (event) => {
  const target = event.target;
  const card = target.closest('.project-card');
  if (!target || !card || !supabase) return;

  const action = target.dataset.action;
  if (!action) return;

  const id = card.dataset.id;

  if (action === 'delete-initiative') {
    const confirmed = window.confirm('Delete this initiative?');
    if (!confirmed) return;

    const { error } = await supabase.from('initiatives').delete().eq('id', id);
    if (error) {
      showMessage(error.message, 'error');
      return;
    }

    showMessage('Initiative deleted.');
    await loadAllData();
    return;
  }

  if (action === 'save-initiative') {
    const department_id = Number(card.querySelector('[data-field="department_id"]').value);
    const owner = card.querySelector('[data-field="owner"]').value.trim();
    const status = card.querySelector('[data-field="status"]').value;
    const progress = Math.max(0, Math.min(100, Number(card.querySelector('[data-field="progress"]').value || 0)));
    const description = card.querySelector('[data-field="description"]').value.trim();

    if (!department_id) {
      showMessage('Select a department.', 'error');
      return;
    }

    const { error } = await supabase
      .from('initiatives')
      .update({ department_id, owner, status, progress, description, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      showMessage(error.message, 'error');
      return;
    }

    showMessage('Initiative updated.');
    await loadAllData();
  }
});

projectsContainer.addEventListener('click', async (event) => {
  const target = event.target;
  const card = target.closest('.project-card');

  if (!target || !card || !supabase) return;

  const action = target.dataset.action;
  if (!action) return;

  const id = card.dataset.id;

  if (action === 'delete-project') {
    const confirmed = window.confirm('Delete this project?');
    if (!confirmed) return;

    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      showMessage(error.message, 'error');
      return;
    }

    showMessage('Project deleted.');
    await loadProjects();
    return;
  }

  if (action === 'save-project') {
    const status = card.querySelector('[data-field="status"]').value;
    const progress = Math.max(0, Math.min(100, Number(card.querySelector('[data-field="progress"]').value || 0)));
    const source_url = card.querySelector('[data-field="source_url"]').value.trim();
    const repository_url = card.querySelector('[data-field="repository_url"]').value.trim();
    const clone_notes = card.querySelector('[data-field="clone_notes"]').value.trim();

    const { error } = await supabase
      .from('projects')
      .update({ status, progress, source_url, repository_url, clone_notes, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      showMessage(error.message, 'error');
      return;
    }

    showMessage('Project updated.');
    await loadProjects();
  }
});

(function init() {
  const { url, key } = getSavedConfig();
  supabaseUrlInput.value = url;
  supabaseAnonKeyInput.value = key;

  connectSupabase();
  loadAllData().catch((error) => showMessage(error.message, 'error'));
})();
