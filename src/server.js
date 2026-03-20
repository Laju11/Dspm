const express = require('express');
const path = require('path');
const db = require('./db');
const { cloneWebsite } = require('./cloneService');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

function mapProject(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    progress: row.progress,
    sourceUrl: row.source_url,
    repositoryUrl: row.repository_url,
    clonedPath: row.cloned_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

app.get('/api/projects', (_, res) => {
  db.all('SELECT * FROM projects ORDER BY id DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to load projects' });
    }

    res.json(rows.map(mapProject));
  });
});

app.post('/api/projects', (req, res) => {
  const { name, description, status, progress, sourceUrl, repositoryUrl } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Project name is required' });
  }

  const now = new Date().toISOString();
  const projectStatus = status || 'planned';
  const projectProgress = Number.isInteger(progress) ? progress : Number(progress || 0);

  db.run(
    `INSERT INTO projects
      (name, description, status, progress, source_url, repository_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      description || '',
      projectStatus,
      Math.max(0, Math.min(100, projectProgress)),
      sourceUrl || '',
      repositoryUrl || '',
      now,
      now
    ],
    function onInsert(err) {
      if (err) {
        return res.status(500).json({ message: 'Failed to create project' });
      }

      db.get('SELECT * FROM projects WHERE id = ?', [this.lastID], (getErr, row) => {
        if (getErr) {
          return res.status(500).json({ message: 'Project created but failed to fetch it' });
        }

        return res.status(201).json(mapProject(row));
      });
    }
  );
});

app.put('/api/projects/:id', (req, res) => {
  const id = Number(req.params.id);
  const { name, description, status, progress, sourceUrl, repositoryUrl, clonedPath } = req.body;

  if (!id) {
    return res.status(400).json({ message: 'Invalid project ID' });
  }

  if (!name) {
    return res.status(400).json({ message: 'Project name is required' });
  }

  const now = new Date().toISOString();
  const projectProgress = Number.isInteger(progress) ? progress : Number(progress || 0);

  db.run(
    `UPDATE projects
      SET name = ?,
          description = ?,
          status = ?,
          progress = ?,
          source_url = ?,
          repository_url = ?,
          cloned_path = ?,
          updated_at = ?
      WHERE id = ?`,
    [
      name,
      description || '',
      status || 'planned',
      Math.max(0, Math.min(100, projectProgress)),
      sourceUrl || '',
      repositoryUrl || '',
      clonedPath || '',
      now,
      id
    ],
    function onUpdate(err) {
      if (err) {
        return res.status(500).json({ message: 'Failed to update project' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ message: 'Project not found' });
      }

      db.get('SELECT * FROM projects WHERE id = ?', [id], (getErr, row) => {
        if (getErr) {
          return res.status(500).json({ message: 'Project updated but failed to fetch it' });
        }

        return res.json(mapProject(row));
      });
    }
  );
});

app.delete('/api/projects/:id', (req, res) => {
  const id = Number(req.params.id);

  if (!id) {
    return res.status(400).json({ message: 'Invalid project ID' });
  }

  db.run('DELETE FROM projects WHERE id = ?', [id], function onDelete(err) {
    if (err) {
      return res.status(500).json({ message: 'Failed to delete project' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    return res.status(204).send();
  });
});

app.post('/api/projects/:id/clone', async (req, res) => {
  const id = Number(req.params.id);
  const { url } = req.body;

  if (!id) {
    return res.status(400).json({ message: 'Invalid project ID' });
  }

  if (!url) {
    return res.status(400).json({ message: 'Website URL is required' });
  }

  db.get('SELECT * FROM projects WHERE id = ?', [id], async (err, row) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to load project' });
    }

    if (!row) {
      return res.status(404).json({ message: 'Project not found' });
    }

    try {
      const clonedPath = await cloneWebsite({
        url,
        projectName: row.name
      });

      const now = new Date().toISOString();

      db.run(
        'UPDATE projects SET source_url = ?, cloned_path = ?, updated_at = ? WHERE id = ?',
        [url, clonedPath, now, id],
        function onCloneUpdate(updateErr) {
          if (updateErr) {
            return res.status(500).json({ message: 'Website cloned but project failed to update' });
          }

          db.get('SELECT * FROM projects WHERE id = ?', [id], (fetchErr, updatedRow) => {
            if (fetchErr) {
              return res.status(500).json({ message: 'Clone completed but failed to fetch project' });
            }

            return res.json(mapProject(updatedRow));
          });
        }
      );
    } catch (cloneErr) {
      return res.status(500).json({
        message: 'Clone failed. Some modern websites block full static cloning.',
        error: cloneErr.message
      });
    }
  });
});

app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Project manager running at http://localhost:${PORT}`);
});
