require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const path = require('path');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

const usePgSessionStore =
  process.env.USE_PG_SESSION === 'true' || process.env.NODE_ENV === 'production';

const sessionOptions = {
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
};

if (usePgSessionStore) {
  sessionOptions.store = new pgSession({
    conString: process.env.DATABASE_URL || '',
    createTableIfMissing: false
  });
}

app.use(
  session(sessionOptions)
);

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
}

async function renderAdminDashboard(req, res) {
  try {
    const { data: users } = await supabase
      .from('users')
      .select('*, departments(name)');

    const { data: departments } = await supabase
      .from('departments')
      .select('*');

    return res.render('admin-dashboard', { users, departments, userEmail: req.session.userEmail, userRole: req.session.userRole });
  } catch (error) {
    console.error(error);
    return res.send('Error loading admin dashboard');
  }
}

app.get('/', async (req, res) => {
  if (req.session.userId) {
    if (req.session.userRole === 'admin') {
      return renderAdminDashboard(req, res);
    }
    return res.redirect('/dashboard');
  }
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  if (req.session.userId) {
    if (req.session.userRole === 'admin') {
      return res.redirect('/');
    }
    return res.redirect('/dashboard');
  }
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';

  if (!email || !password) {
    return res.render('login', { error: 'Email and password required' });
  }

  try {
    const { data: users, error: queryError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (queryError || !users) {
      return res.render('login', { error: 'Invalid email or password' });
    }

    if (users.status !== 'approved') {
      if (users.status === 'pending_approval') {
        return res.render('login', { error: 'Your account is pending admin approval.' });
      }
      if (users.status === 'rejected') {
        return res.render('login', { error: 'Your account was rejected. Contact admin.' });
      }
      return res.render('login', { error: 'Your account is not active.' });
    }

    const validPassword = await bcrypt.compare(password, users.password_hash);
    if (!validPassword) {
      return res.render('login', { error: 'Invalid email or password' });
    }

    req.session.userId = users.id;
    req.session.userRole = users.role;
    req.session.userEmail = users.email;
    req.session.departmentId = users.department_id;

    if (users.role === 'admin') {
      return res.redirect('/');
    }

    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    res.render('login', { error: 'Server error' });
  }
});

app.get('/register', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('register', { error: null });
});

app.post('/register', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  const passwordConfirm = req.body.passwordConfirm || '';

  if (!email || !password || !passwordConfirm) {
    return res.render('register', { error: 'All fields required' });
  }

  if (password !== passwordConfirm) {
    return res.render('register', { error: 'Passwords do not match' });
  }

  try {
    const { data: existingUser, error: existingUserError } = await supabase
      .from('users')
      .select('email, status')
      .eq('email', email)
      .maybeSingle();

    if (existingUserError) {
      console.error(existingUserError);
      return res.render('register', { error: 'Unable to verify existing account. Try again.' });
    }

    if (existingUser) {
      if (existingUser.status === 'pending_approval') {
        return res.render('register', {
          error: 'This email is already registered and awaiting admin approval.'
        });
      }
      return res.render('register', {
        error: 'This email is already registered. Please log in instead.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { error: insertError } = await supabase.from('users').insert([
      {
        email,
        password_hash: passwordHash,
        role: 'user',
        status: 'pending_approval'
      }
    ]);

    if (insertError) {
      if (insertError.code === '23505') {
        return res.render('register', {
          error: 'This email is already registered. Please log in instead.'
        });
      }
      console.error(insertError);
      return res.render('register', { error: 'Could not create account. Try again.' });
    }

    res.render('register', { error: 'Registration success! Awaiting admin approval.' });
  } catch (error) {
    console.error(error);
    res.render('register', { error: 'Server error' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send('Logout error');
    }
    res.redirect('/login');
  });
});

app.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.session.userId)
      .single();

    if (!user) {
      return res.redirect('/logout');
    }

    if (user.role === 'admin') {
      return res.redirect('/');
    } else if (user.role === 'department_head') {
      return res.redirect('/department-head');
    } else {
      return res.redirect('/project-manager');
    }
  } catch (error) {
    console.error(error);
    res.send('Error loading dashboard');
  }
});

app.get('/admin', requireAuth, async (req, res) => {
  if (req.session.userRole !== 'admin') {
    return res.status(403).send('Unauthorized');
  }

  return renderAdminDashboard(req, res);
});

app.get('/department-head', requireAuth, async (req, res) => {
  if (req.session.userRole !== 'department_head') {
    return res.status(403).send('Unauthorized');
  }

  try {
    const { data: department } = await supabase
      .from('departments')
      .select('*')
      .eq('id', req.session.departmentId)
      .single();

    const { data: initiatives } = await supabase
      .from('initiatives')
      .select('*')
      .eq('department_id', req.session.departmentId);

    res.render('department-head-dashboard', {
      department,
      initiatives,
      userEmail: req.session.userEmail
    });
  } catch (error) {
    console.error(error);
    res.send('Error loading department dashboard');
  }
});

app.get('/project-manager', requireAuth, async (req, res) => {
  if (req.session.userRole !== 'project_manager') {
    return res.status(403).send('Unauthorized');
  }

  try {
    const { data: initiatives } = await supabase
      .from('initiatives')
      .select('*, departments(name)');

    const { data: departments } = await supabase
      .from('departments')
      .select('*');

    res.render('project-manager-dashboard', {
      initiatives,
      departments,
      userEmail: req.session.userEmail
    });
  } catch (error) {
    console.error(error);
    res.send('Error loading project manager dashboard');
  }
});

// ── Departments ─────────────────────────────────────────────────────────────
app.get('/departments', requireAuth, async (req, res) => {
  try {
    const { data: rawDepts } = await supabase.from('departments').select('*').order('name');
    const { data: initiatives } = await supabase.from('initiatives').select('department_id');
    const countMap = {};
    (initiatives || []).forEach(i => { countMap[i.department_id] = (countMap[i.department_id] || 0) + 1; });
    const departments = (rawDepts || []).map(d => ({ ...d, initiativeCount: countMap[d.id] || 0 }));
    res.render('departments', {
      departments,
      userEmail: req.session.userEmail,
      userRole: req.session.userRole,
      message: req.query.msg || null,
      messageType: req.query.type || 'success'
    });
  } catch (err) {
    console.error(err);
    res.send('Error loading departments');
  }
});

app.post('/departments', requireAuth, async (req, res) => {
  if (req.session.userRole !== 'admin') return res.status(403).send('Unauthorized');
  const name = (req.body.name || '').trim();
  const description = (req.body.description || '').trim();
  if (!name) return res.redirect('/departments?msg=Name+required&type=error');
  const { error } = await supabase.from('departments').insert([{ name, description }]);
  if (error) {
    if (error.code === '23505') return res.redirect('/departments?msg=Department+already+exists&type=error');
    return res.redirect('/departments?msg=Could+not+create+department&type=error');
  }
  res.redirect('/departments?msg=Department+created&type=success');
});

// ── Initiatives ───────────────────────────────────────────────────────────────
app.get('/initiatives', requireAuth, async (req, res) => {
  try {
    const { department, status } = req.query;
    let query = supabase.from('initiatives').select('*, departments(name)').order('created_at', { ascending: false });
    if (department) query = query.eq('department_id', department);
    if (status)     query = query.eq('status', status);
    const { data: initiatives } = await query;
    const { data: departments } = await supabase.from('departments').select('*').order('name');
    res.render('initiatives', {
      initiatives: initiatives || [],
      departments: departments || [],
      userEmail: req.session.userEmail,
      userRole: req.session.userRole,
      selectedDept: department || '',
      selectedStatus: status || ''
    });
  } catch (err) {
    console.error(err);
    res.send('Error loading initiatives');
  }
});

app.get('/initiatives/new', requireAuth, async (req, res) => {
  if (!['admin', 'department_head'].includes(req.session.userRole)) {
    return res.status(403).send('Unauthorized');
  }
  const { data: departments } = await supabase.from('departments').select('*').order('name');
  res.render('initiative-new', {
    departments: departments || [],
    userEmail: req.session.userEmail,
    userRole: req.session.userRole,
    error: null,
    prefill: { department_id: req.session.departmentId || '' }
  });
});

app.post('/initiatives', requireAuth, async (req, res) => {
  if (!['admin', 'department_head'].includes(req.session.userRole)) {
    return res.status(403).send('Unauthorized');
  }
  const { name, department_id, owner, status, progress, description } = req.body;
  const { data: departments } = await supabase.from('departments').select('*').order('name');
  if (!name || !department_id) {
    return res.render('initiative-new', {
      departments: departments || [], userEmail: req.session.userEmail,
      userRole: req.session.userRole, error: 'Name and department are required.',
      prefill: req.body
    });
  }
  const { error } = await supabase.from('initiatives').insert([{
    name: name.trim(), department_id: parseInt(department_id),
    owner: (owner || '').trim() || null,
    status: status || 'planned',
    progress: parseInt(progress) || 0,
    description: (description || '').trim() || null
  }]);
  if (error) {
    console.error(error);
    return res.render('initiative-new', {
      departments: departments || [], userEmail: req.session.userEmail,
      userRole: req.session.userRole, error: 'Failed to create initiative.',
      prefill: req.body
    });
  }
  res.redirect('/initiatives');
});

app.get('/initiatives/:id/update', requireAuth, async (req, res) => {
  try {
    const { data: initiative } = await supabase
      .from('initiatives').select('*, departments(name)').eq('id', req.params.id).single();
    if (!initiative) return res.status(404).send('Initiative not found');
    const { data: updates } = await supabase
      .from('initiative_updates').select('*').eq('initiative_id', req.params.id)
      .order('created_at', { ascending: false });
    res.render('initiative-update', {
      initiative, updates: updates || [],
      userEmail: req.session.userEmail,
      userRole: req.session.userRole,
      error: null, success: null
    });
  } catch (err) {
    console.error(err);
    res.send('Error loading initiative');
  }
});

app.post('/initiatives/:id/update', requireAuth, async (req, res) => {
  const { status, progress, owner, update_note } = req.body;
  const id = req.params.id;
  try {
    await supabase.from('initiatives').update({
      status: status || 'planned',
      progress: parseInt(progress) || 0,
      owner: (owner || '').trim() || null,
      updated_at: new Date().toISOString()
    }).eq('id', id);

    if (update_note && update_note.trim()) {
      await supabase.from('initiative_updates').insert([{
        initiative_id: parseInt(id),
        status: status || 'planned',
        progress: parseInt(progress) || 0,
        note: update_note.trim(),
        updated_by: req.session.userId
      }]);
    }

    const { data: initiative } = await supabase
      .from('initiatives').select('*, departments(name)').eq('id', id).single();
    const { data: updates } = await supabase
      .from('initiative_updates').select('*').eq('initiative_id', id)
      .order('created_at', { ascending: false });
    res.render('initiative-update', {
      initiative, updates: updates || [],
      userEmail: req.session.userEmail,
      userRole: req.session.userRole,
      error: null, success: 'Initiative updated successfully.'
    });
  } catch (err) {
    console.error(err);
    res.send('Error saving update');
  }
});

app.listen(PORT, () => {
  console.log(`DSPM running at http://localhost:${PORT}`);
});
