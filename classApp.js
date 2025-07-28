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
        res.redirect('/login');
    }
};

// Middleware for form validation

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
    res.redirect('/login');
});

// Define routes
//members page


/*****************************************************************************************************/

/*classes page */
// View all classes

app.get('/classView', checkAuthenticated, (req, res) => {
    const sql = 'SELECT * FROM classT';
    connection.query(sql, (err, classes) => {
        if (err) {
            console.error('Database error:', err);
            req.flash('error', 'Error loading classes: ' + err.message);
            return res.redirect(req.session.user.role === 'admin' ? '/admin' : '/dashboard');
        }
        
        res.render('classView', { 
            classT: classes,
            user: req.session.user,
            isAdmin: req.session.user.role === 'admin'
        });
    });
});

// Add class GET
app.get('/addClass', checkAuthenticated, checkAdmin, (req, res) => {
    res.render('addClass', { user: req.session.user });
});

// Add class POST
app.post('/addClass', checkAuthenticated, checkAdmin, (req, res) => {
    const { className, description, startTime, endTime, price ,location,roomID} = req.body;
    const sql = 'INSERT INTO classT (className, description, startTime, endTime, price , location,roomID) VALUES (?, ?, ?, ?, ?, ?, ?)';
    connection.query(sql, [className, description, startTime, endTime, price ,location,roomID], err => {
        if (err) {
            console.error('Error adding class:', err);
            return res.status(500).send('Error adding class');
            }
            else
            {
                res.redirect('/classView'); // Redirect to the class view page after adding the class
            }
        });
});


app.get('/editClass/:id', checkAuthenticated, checkAdmin, (req, res) => {
    const classID = req.params.id;
    const sql = 'SELECT * FROM classT WHERE classID = ?';
    connection.query(sql, [classID], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            req.flash('error', 'Error retrieving class');
            return res.redirect('/classView');
        }
        if (results.length > 0) {
            res.render('editClass', { 
                classItem: results[0],  // Changed from classID to classItem for clarity
                user: req.session.user 
            }); 
        } else {
            req.flash('error', 'Class not found');
            res.redirect('/classView');
        }
    });
});

// Fixed editClass POST route
app.post('/editClass/:id', checkAuthenticated, checkAdmin, (req, res) => {
    const classID = req.params.id;
    const { className, description, startTime, endTime, price, location, roomID } = req.body;
    const sql = 'UPDATE classT SET className = ?, description = ?, startTime = ?, endTime = ?, price = ?, location = ?, roomID = ? WHERE classID = ?';
    connection.query(sql, [className, description, startTime, endTime, price, location, roomID, classID], (error, results) => {
        if (error) {
            console.error('Error updating class:', error);
            req.flash('error', 'Error updating class');
            return res.redirect('/editClass/' + classID);
        }
        req.flash('success', 'Class updated successfully');
        res.redirect('/classView'); 
    });
});

// Add delete class route 
app.get('/deleteClass/:id', checkAuthenticated, checkAdmin, (req, res) => {
    const classID = req.params.id;
    const sql = 'DELETE FROM classT WHERE classID = ?';
    connection.query(sql, [classID], (error, results) => {
        if (error) {
            console.error('Error deleting class:', error);
            req.flash('error', 'Error deleting class');
        } else {
            req.flash('success', 'Class deleted successfully');
        }
        res.redirect('/classView');
    });
});
const PORT = process.env.PORT || 3307;
app.listen(PORT, () => console.log(`Server running on port http://localhost:${PORT}/login`));

