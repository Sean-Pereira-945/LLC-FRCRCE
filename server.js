const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = express();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = '';
    if (file.fieldname === 'syllabus') {
      uploadPath = path.join(__dirname, 'uploads', 'syllabus');
    } else if (file.fieldname === 'logo') {
      uploadPath = path.join(__dirname, 'uploads', 'courses');
    }
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/learning_platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Create User Schema
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  userType: { type: String, enum: ['student', 'teacher'], required: true },
  name: { type: String, required: true }
});

// Create Course Schema
const CourseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  schedule: { type: String, required: true },
  capacity: { type: Number, required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  imageUrl: { type: String },
  syllabusPath: { type: String, required: true },
  logo: { type: String },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  category: { 
    type: String, 
    required: true,
    enum: ['Technical', 'Non-technical', 'Self-Development', 'Extra-curricular']
  }
});

// Create Models
const User = mongoose.model('User', UserSchema);
const Course = mongoose.model('Course', CourseSchema);

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ success: false, message: 'Access denied' });
  
  jwt.verify(token, 'YOUR_SECRET_KEY', (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'home.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'about.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'contact.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/teacher-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'teacher-login.html'));
});

app.get('/teacher-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'teacher-dashboard.html'));
});

app.get('/student-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'student-dashboard.html'));
});

// API Routes

// Register User
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, userType } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      userType
    });
    
    await user.save();
    
    // Generate token
    const token = jwt.sign(
      { id: user._id, userType: user.userType },
      'YOUR_SECRET_KEY',
      { expiresIn: '1h' }
    );
    
    res.status(201).json({ token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, userType } = req.body;
    
    // Find user
    const user = await User.findOne({ email, userType });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign(
      { id: user._id, userType: user.userType },
      'YOUR_SECRET_KEY',
      { expiresIn: '1h' }
    );
    
    res.json({ 
      success: true,
      message: 'Login successful',
      token,
      userType: user.userType,
      name: user.name
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add Course (Teacher Only)
app.post('/api/courses', authenticateToken, upload.fields([{ name: 'syllabus', maxCount: 1 }, { name: 'logo', maxCount: 1 }]), async (req, res) => {
  try {
    console.log('Files received:', req.files);
    console.log('Body received:', req.body);
    
    // Check if user is a teacher
    if (req.user.userType !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Only teachers can add courses' });
    }
    
    const { courseName, description, schedule, capacity, category, logoUrl } = req.body;
    const syllabusPath = req.files && req.files.syllabus ? `/uploads/syllabus/${req.files.syllabus[0].filename}` : null;
    
    console.log('Syllabus Path:', syllabusPath);
    console.log('Logo URL:', logoUrl);
    
    if (!courseName || !description || !schedule || !capacity || !syllabusPath || !category) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    
    // Create new course
    const course = new Course({
      name: courseName,
      description,
      schedule,
      capacity: parseInt(capacity),
      teacher: req.user.id,
      syllabusPath,
      logo: logoUrl, // Use the provided URL
      students: [],
      category
    });
    
    await course.save();
    
    res.status(201).json({ success: true, message: 'Course added successfully' });
  } catch (error) {
    console.error('Add course error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Get Courses (Teacher)
app.get('/api/courses/teacher', authenticateToken, async (req, res) => {
  try {
    // Check if user is a teacher
    if (req.user.userType !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Find courses by teacher and populate student information
    const courses = await Course.find({ teacher: req.user.id })
      .populate('students', 'name email');
    
    res.json({ success: true, courses });
  } catch (error) {
    console.error('Get teacher courses error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get Courses (Student)
app.get('/api/courses/student', async (req, res) => {
  try {
    // Find all courses and populate teacher information
    const courses = await Course.find()
      .populate('teacher', 'name')
      .populate('students', 'name email');
    
    res.json({ success: true, courses });
  } catch (error) {
    console.error('Get student courses error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// View Syllabus (Image)
app.get('/api/courses/syllabus/:id', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    
    // Send the image file
    res.sendFile(path.join(__dirname, course.syllabusPath));
  } catch (error) {
    console.error('View syllabus error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete Course (Teacher Only)
app.delete('/api/courses/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is a teacher
    if (req.user.userType !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Only teachers can delete courses' });
    }
    
    const course = await Course.findOne({
      _id: req.params.id,
      teacher: req.user.id
    });
    
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found or unauthorized' });
    }
    
    try {
      // Delete syllabus file if it exists
      if (course.syllabusPath) {
        const fullPath = path.join(__dirname, course.syllabusPath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
      
      // Delete logo file if it exists
      if (course.logo) {
        const fullPath = path.join(__dirname, course.logo);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
    } catch (fileError) {
      console.error('Error deleting files:', fileError);
      // Continue with course deletion even if file deletion fails
    }
    
    // Delete course from database
    await Course.deleteOne({ _id: req.params.id });
    
    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Student Enrollment
app.post('/api/courses/enroll/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is a student
    if (req.user.userType !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can enroll in courses' });
    }
    
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    
    // Check if course is full
    if (course.students.length >= course.capacity) {
      return res.status(400).json({ success: false, message: 'Course is full' });
    }
    
    // Check if student is already enrolled
    if (course.students.includes(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Already enrolled in this course' });
    }
    
    // Add student to course
    course.students.push(req.user.id);
    await course.save();
    
    res.json({ success: true, message: 'Enrolled successfully' });
  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Search Courses
app.get('/api/courses/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }
    
    const courses = await Course.find({
      name: { $regex: q, $options: 'i' }
    }).populate('teacher', 'name');
    
    res.json({ success: true, courses });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Search Results Page
app.get('/search', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'search-results.html'));
});

// Protected Routes
app.get('/api/teacher/courses', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'teacher') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const courses = await Course.find({ teacher: req.user.id })
      .populate('teacher', 'name email')
      .populate('students', 'name email');

    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Contact Form Endpoint
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    
    // Here you would typically save the contact form data to a database
    // or send an email. For now, we'll just log it and send a success response.
    console.log('Contact Form Submission:', { name, email, subject, message });
    
    res.json({ 
      success: true, 
      message: 'Message received successfully!' 
    });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send message. Please try again.' 
    });
  }
});

// Get Single Course
app.get('/api/courses/:id', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    
    res.json({ success: true, course });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update Course
app.put('/api/courses/:id', authenticateToken, upload.fields([{ name: 'syllabus', maxCount: 1 }, { name: 'logo', maxCount: 1 }]), async (req, res) => {
  try {
    // Check if user is a teacher
    if (req.user.userType !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Only teachers can update courses' });
    }
    
    const course = await Course.findOne({
      _id: req.params.id,
      teacher: req.user.id
    });
    
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found or unauthorized' });
    }
    
    const { courseName, description, schedule, capacity } = req.body;
    
    // Update course fields
    course.name = courseName;
    course.description = description;
    course.schedule = schedule;
    course.capacity = parseInt(capacity);
    
    // Update syllabus if new one is uploaded
    if (req.files && req.files.syllabus) {
      // Delete old syllabus file if it exists
      if (course.syllabusPath) {
        const oldSyllabusPath = path.join(__dirname, course.syllabusPath);
        if (fs.existsSync(oldSyllabusPath)) {
          fs.unlinkSync(oldSyllabusPath);
        }
      }
      course.syllabusPath = `/uploads/syllabus/${req.files.syllabus[0].filename}`;
    }
    
    // Update logo if new one is uploaded
    if (req.files && req.files.logo) {
      // Delete old logo file if it exists
      if (course.logo) {
        const oldLogoPath = path.join(__dirname, course.logo);
        if (fs.existsSync(oldLogoPath)) {
          fs.unlinkSync(oldLogoPath);
        }
      }
      course.logo = `/uploads/courses/${req.files.logo[0].filename}`;
    }
    
    await course.save();
    
    res.json({ success: true, message: 'Course updated successfully' });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});