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

app.get('/', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render('login', { error: 'Email and password required' });
  }

  try {
    const { data: users, error: queryError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (queryError || !users) {
      return res.render('login', { error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, users.password_hash);
    if (!validPassword) {
      return res.render('login', { error: 'Invalid email or password' });
    }

    req.session.userId = users.id;
    req.session.userRole = users.role;
    req.session.userEmail = users.email;
    req.session.departmentId = users.department_id;

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
  const { email, password, passwordConfirm } = req.body;

  if (!email || !password || !passwordConfirm) {
    return res.render('register', { error: 'All fields required' });
  }

  if (password !== passwordConfirm) {
    return res.render('register', { error: 'Passwords do not match' });
  }

  try {
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
      return res.render('register', { error: 'Email already exists or server error' });
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
      return res.redirect('/admin');
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

  try {
    const { data: users } = await supabase
      .from('users')
      .select('*, departments(name)');

    const { data: departments } = await supabase
      .from('departments')
      .select('*');

    res.render('admin-dashboard', { users, departments, userEmail: req.session.userEmail });
  } catch (error) {
    console.error(error);
    res.send('Error loading admin dashboard');
  }
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

app.listen(PORT, () => {
  console.log(`DSPM running at http://localhost:${PORT}`);
});
