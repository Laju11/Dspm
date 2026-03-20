import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const STORAGE_KEYS = {
  url: 'dspm_supabase_url',
  key: 'dspm_supabase_anon_key'
};

const configForm = document.getElementById('configForm');
const projectForm = document.getElementById('projectForm');
const projectsContainer = document.getElementById('projects');
const messageEl = document.getElementById('message');
const supabaseUrlInput = document.getElementById('supabaseUrl');
const supabaseAnonKeyInput = document.getElementById('supabaseAnonKey');

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

function projectCardTemplate(project) {
  return `
    <article class="project-card" data-id="${project.id}">
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
        <button data-action="save">Update</button>
        <button class="danger" data-action="delete">Delete</button>
      </div>

      <div class="small">Updated: ${new Date(project.updated_at).toLocaleString()}</div>
    </article>
  `;
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
  await loadProjects();
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
  await loadProjects();
});

projectsContainer.addEventListener('click', async (event) => {
  const target = event.target;
  const card = target.closest('.project-card');

  if (!target || !card || !supabase) return;

  const action = target.dataset.action;
  if (!action) return;

  const id = card.dataset.id;

  if (action === 'delete') {
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

  if (action === 'save') {
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
  loadProjects().catch((error) => showMessage(error.message, 'error'));
})();
