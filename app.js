const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const app = express();

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); // Directory to save uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); 
    }
});

const upload = multer({ storage: storage });

const connection = mysql.createConnection({
    connectionLimit: 10,
    host: 'hsafi8.h.filess.io',
    user: 'C237CA2_topsortjar',
    password: '7a19b1fa6075866d1b321e5554d63c85d7cb1480',
    database: 'C237CA2_topsortjar',
    port: 3307
  });

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Set up view engine
app.set('view engine', 'ejs');
//  enable static files
app.use(express.static('public'));
// enable form processing
app.use(express.urlencoded({
    extended: false
}));

//TO DO: Insert code for Session Middleware below 
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    // Session expires after 1 week of inactivity
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } 
}));

app.use(flash());

// Middleware to check if user is logged in
const checkAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    } else {
        req.flash('error', 'Please log in to view this resource');
        res.redirect('/login');
    }
};

// Middleware to check if user is admin
const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    } else {
        req.flash('error', 'Access denied');
        res.redirect('/');
    }
};

// Middleware for form validation
app.get('/',  (req, res) => {
    res.render('index', {user: req.session.user} );
});

app.get('/register', (req, res) => {
    res.render('register', { 
        messages: req.flash('error'), 
        formData: req.flash('formData')[0] || {} 
    });
});

const validateRegistration = (req, res, next) => {
    const { memberName, email, password, address, phone, role } = req.body;

    if (!memberName || !email || !password || !address || !phone || !role) {
        return res.status(400).send('All fields are required.');
    }
    
    if (password.length < 6) {
        req.flash('error', 'Password should be at least 6 or more characters long');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }
    next();
};

// Fixed registration POST route
app.post('/register', validateRegistration, (req, res) => {
    const { memberName, email, password, address, phone, role } = req.body;
    
    console.log('Registration attempt:', { memberName, email, role }); // Debug log
    
    const sql = 'INSERT INTO members (memberName, email, password, address, phone, role) VALUES (?, ?, SHA1(?), ?, ?, ?)';
    
    connection.query(sql, [memberName, email, password, address, phone, role], (err, result) => {
        if (err) {
            console.error('Registration error:', err); // Debug log
            if (err.code === 'ER_DUP_ENTRY') {
                req.flash('error', 'Email already exists. Please use a different email.');
                req.flash('formData', req.body);
                return res.redirect('/register');
            } 
            // Handle other database errors
            req.flash('error', 'Registration failed. Please try again.');
            req.flash('formData', req.body);
            return res.redirect('/register');
        }
        
        console.log('User registered successfully with ID:', result.insertId); // Debug log
        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/login');
    });
});

app.get('/login', (req, res) => {
    res.render('login', { 
        messages: req.flash('success'), 
        errors: req.flash('error') 
    });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        req.flash('error', 'Email and password required.');
        return res.redirect('/login');
    }
    
    console.log('Login attempt for email:', email); // Debug log
    
    const sql = 'SELECT * FROM members WHERE email = ? AND password = SHA1(?)';
    connection.query(sql, [email, password], (err, results) => {
        if (err) {
            console.error('Login database error:', err);
            req.flash('error', 'Server error occurred. Please try again.');
            return res.redirect('/login');
        }
        
        console.log('Query results:', results.length, 'users found'); // Debug log
        
        if (results.length > 0) {
            req.session.user = results[0];
            console.log('User logged in:', results[0].memberName, 'Role:', results[0].role); // Debug log
            
            // Redirect based on role
            if (results[0].role === 'admin') {
                res.redirect('/admin');
            } else {
                res.redirect('/dashboard');
            }
        } else {
            req.flash('error', 'Invalid email or password.');
            res.redirect('/login');
        }
    });
});

// Also update your dashboard route to handle role properly
app.get('/dashboard', checkAuthenticated, (req, res) => {
    // If user is admin, redirect to admin dashboard
    if (req.session.user && req.session.user.role === 'admin') {
        return res.redirect('/admin');
    }
    res.render('dashboard', { user: req.session.user });
});

app.get('/admin', checkAuthenticated, checkAdmin, (req, res) => {
    res.render('admin', { user: req.session.user });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Define routes
app.get('/members', checkAuthenticated, (req, res) => {
    const search = req.query.search;
    let sql = 'SELECT * FROM members';
    const params = [];
    if (search) {
        sql += ' WHERE memberName LIKE ?';
        params.push(`%${search}%`);
    }
    connection.query(sql, params, (err, results) => {
        if (err) throw err;
        res.render('index', { members: results, search: search || '', messages: req.flash('success'), user: req.session.user });
    });
});

app.get('/members/new', checkAuthenticated, checkAdmin, (req, res) => {
    res.render('newmember');
});

app.post('/members/new', checkAuthenticated, checkAdmin, (req, res) => {
    const { memberName, email, password, address, phone, role } = req.body;
    const sql = 'INSERT INTO members (memberName, email, password, address, phone, role) VALUES (?, ?, SHA1(?), ?, ?, ?)';
    connection.query(sql, [memberName, email, password, address, phone, role], (err) => {
        if (err) throw err;
        req.flash('success', 'Member added.');
        res.redirect('/members');
    });
});

app.get('/members/edit/:id', checkAuthenticated, checkAdmin, (req, res) => {
    connection.query('SELECT * FROM members WHERE memberID = ?', [req.params.id], (err, results) => {
        if (err) throw err;
        res.render('edit', { member: results[0] });
    });
});

app.post('/members/edit/:id', checkAuthenticated, checkAdmin, (req, res) => {
    const { memberName, email, address, phone, role } = req.body;
    const sql = 'UPDATE members SET memberName=?, email=?, address=?, phone=?, role=? WHERE memberID=?';
    connection.query(sql, [memberName, email, address, phone, role, req.params.id], (err) => {
        if (err) throw err;
        req.flash('success', 'Member updated.');
        res.redirect('/members');
    });
});

app.post('/members/delete/:id', checkAuthenticated, checkAdmin, (req, res) => {
    connection.query('DELETE FROM members WHERE memberID = ?', [req.params.id], (err) => {
        if (err) throw err;
        req.flash('success', 'Member deleted.');
        res.redirect('/members');
    });
});


//location
app.get('/loc', (req, res) => {
  const keyword = req.query.keyword;
  let sql = 'SELECT * FROM locations';
  let params = [];

  if (keyword && keyword.trim() !== '') {
    sql += ' WHERE location_name LIKE ? OR address LIKE ?';
    const likeKeyword = `%${keyword}%`;
    params.push(likeKeyword, likeKeyword);
  }

  connection.query(sql, params, (error, results) => {
    if (error) {
      console.error('Database query error:', error.message);
      return res.status(500).send('Error retrieving locations');
    }
    res.render('index', { locations: results, keyword: keyword });
  });
});

app.get('/location/:id', (req, res) => {
  const locationId = req.params.id;
  const sql = 'SELECT * FROM locations WHERE location_id = ?';
  connection.query(sql, [locationId], (error, results) => {
    if (error) {
      console.error('Database query error:', error.message);
      return res.status(500).send('Error retrieving location');
    }
    if (results.length > 0) {
      res.render('location', { location: results[0] });
    } else {
      res.status(404).send('Location not found');
    }
  });
});

app.get('/addLocation', (req, res) => {
  res.render('addLocation');
});

app.post('/addLocation', upload.single('image'), (req, res) => {
  const { name, address, unit, postal, country, capacity } = req.body;
  let image;
  if (req.file) {
    image = req.file.filename; 
  } else {
    image = null;
  }
  const sql = `
    INSERT INTO locations 
    (location_name, address, unit, postal_code, country, image, capacity) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  connection.query(sql, [name, address, unit, postal, country, image, capacity], (error, results) => {
    if (error) {
      console.error('Error adding location:', error);
      res.status(500).send('Error adding location');
    }
    res.redirect('/');
  });
});

app.get('/editLocation/:id', (req, res) => {
  const locationId = req.params.id;
  const sql = 'SELECT * FROM locations WHERE location_id = ?';
  connection.query(sql, [locationId], (error, results) => {
    if (error) {
      console.error('Database query error:', error.message);
      return res.status(500).send('Error retrieving location');
    }
    if (results.length > 0) {
      res.render('editLocation', { location: results[0] });
    } else {
      res.status(404).send('Location not found');
    }
  });
});

app.post('/editLocation/:id', upload.single('image'), (req, res) => {
  const locationId = req.params.id;
  const { name, address, unit, postal, country,capacity } = req.body;
  let image = req.body.currentImage; 
  if (req.file) { 
    image = req.file.filename; 
  }
  const sql = `
    UPDATE locations 
    SET location_name = ?, address = ?, unit = ?, postal_code = ?, country = ?, image = ?,capacity = ?
    WHERE location_id = ?
  `;
  connection.query(sql, [name, address, unit, postal, country,image,capacity, locationId], (error) => {
    if (error) {
      console.error('Error updating location:', error);
      return res.status(500).send('Error updating location');
    }
    res.redirect('/');
  });
});

app.get('/deleteLocation/:id', (req, res) => {
  const locationId = req.params.id;
  const sql = 'DELETE FROM locations WHERE location_id = ?';
  connection.query(sql, [locationId], (error, results) => {
    if (error) {
      console.error('Error deleting location:', error);
      return res.status(500).send('Error deleting location');
    }
    res.redirect('/');
  });
});



const PORT = process.env.PORT || 3307;
app.listen(PORT, () => console.log(`Server running on port http://localhost:${PORT}`));

