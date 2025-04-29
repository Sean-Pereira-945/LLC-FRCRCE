document.addEventListener('DOMContentLoaded', function() {
  // Check if user is already logged in and on login page
  const token = localStorage.getItem('token');
  const userType = localStorage.getItem('userType');
  
  if (token && (window.location.pathname === '/login' || window.location.pathname === '/teacher-login')) {
    if (userType === 'student') {
      window.location.href = '/student-dashboard';
    } else if (userType === 'teacher') {
      window.location.href = '/teacher-dashboard';
    }
  }

  // Handle Registration Form
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const userType = document.getElementById('user-type').value;
      
      // Send registration request to server
      fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, userType }),
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert('Registration successful! Please login.');
          window.location.href = '/login';
        } else {
          alert('Registration failed: ' + data.message);
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert('An error occurred during registration');
      });
    });
  }

  // Handle Login Form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      // Send login request to server
      fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, userType: 'student' }),
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('userType', data.userType);
          
          // Redirect based on user type
          if (data.userType === 'student') {
            window.location.href = '/student-dashboard';
          } else if (data.userType === 'teacher') {
            window.location.href = '/teacher-dashboard';
          }
        } else {
          alert('Login failed: ' + data.message);
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert('An error occurred during login');
      });
    });
  }

  // Handle Teacher Login Form
  const teacherLoginForm = document.getElementById('loginForm');
  if (teacherLoginForm) {
    teacherLoginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      // Send teacher login request to server
      fetch('/api/auth/teacher-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('userType', 'teacher');
          window.location.href = '/teacher-dashboard';
        } else {
          alert('Login failed: ' + data.message);
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert('An error occurred during login');
      });
    });
  }

  // Handle Adding Course Form
  const addCourseForm = document.getElementById('add-course-form');
  if (addCourseForm) {
    addCourseForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const courseName = document.getElementById('course-name').value;
      const syllabusFile = document.getElementById('syllabus').files[0];
      
      if (!syllabusFile) {
        alert('Please select a syllabus file');
        return;
      }
      
      const formData = new FormData();
      formData.append('courseName', courseName);
      formData.append('syllabus', syllabusFile);
      
      const token = localStorage.getItem('token');
      
      // Send add course request to server
      fetch('/api/courses/add', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert('Course added successfully!');
          document.getElementById('course-name').value = '';
          document.getElementById('syllabus').value = '';
          loadTeacherCourses();
        } else {
          alert('Failed to add course: ' + data.message);
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while adding the course');
      });
    });
  }

  // Load courses for student dashboard
  function loadStudentCourses() {
    const courseList = document.getElementById('course-list');
    if (courseList && window.location.pathname === '/student-dashboard') {
      const token = localStorage.getItem('token');
      
      fetch('/api/courses/student', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          courseList.innerHTML = '';
          data.courses.forEach(course => {
            const li = document.createElement('li');
            li.innerHTML = `
              <strong>Course Name:</strong> ${course.name}
              <br>
              <strong>Teacher:</strong> ${course.teacher ? course.teacher.name : 'Unknown'}
              <br>
              <a href="/api/courses/syllabus/${course._id}" class="download-syllabus" target="_blank">Download Syllabus</a>
              <br>
              <span>Schedule: ${course.schedule}</span>
              <br>
              <button class="enroll-button" data-id="${course._id}">Enroll in Course</button>
            `;
            courseList.appendChild(li);
          });
          
          // Add event listeners to enroll buttons
          document.querySelectorAll('.enroll-button').forEach(button => {
            button.addEventListener('click', function() {
              const courseId = this.getAttribute('data-id');
              enrollInCourse(courseId);
            });
          });
        } else {
          console.error('Failed to load courses:', data.message);
        }
      })
      .catch(error => {
        console.error('Error:', error);
      });
    }
  }

  // Enroll in a course
  function enrollInCourse(courseId) {
    const token = localStorage.getItem('token');
    
    fetch(`/api/courses/enroll/${courseId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert('Enrolled successfully!');
        loadStudentCourses();
      } else {
        alert('Failed to enroll: ' + data.message);
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('An error occurred while enrolling');
    });
  }

  // Load courses for teacher dashboard
  function loadTeacherCourses() {
    const courseList = document.getElementById('course-list');
    if (courseList && window.location.pathname === '/teacher-dashboard') {
      const token = localStorage.getItem('token');
      
      fetch('/api/courses/teacher', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          courseList.innerHTML = '';
          data.courses.forEach(course => {
            const li = document.createElement('li');
            li.innerHTML = `
              <strong>Course Name:</strong> ${course.name}
              <br>
              <a href="/api/courses/syllabus/${course._id}" class="download-syllabus" target="_blank">View Syllabus</a>
              <br>
              <button class="delete-course" data-id="${course._id}">Delete Course</button>
            `;
            courseList.appendChild(li);
          });
          
          // Add event listeners to delete buttons
          document.querySelectorAll('.delete-course').forEach(button => {
            button.addEventListener('click', function() {
              const courseId = this.getAttribute('data-id');
              deleteCourse(courseId);
            });
          });
        } else {
          console.error('Failed to load courses:', data.message);
        }
      })
      .catch(error => {
        console.error('Error:', error);
      });
    }
  }

  // Delete a course
  function deleteCourse(courseId) {
    const token = localStorage.getItem('token');
    
    if (confirm('Are you sure you want to delete this course?')) {
      fetch(`/api/courses/${courseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert('Course deleted successfully!');
          loadTeacherCourses();
        } else {
          alert('Failed to delete course: ' + data.message);
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while deleting the course');
      });
    }
  }

  // Handle search functionality
  const searchBtn = document.getElementById('search-btn');
  if (searchBtn) {
    searchBtn.addEventListener('click', function() {
      const searchInput = document.getElementById('search-input').value;
      if (searchInput.trim() !== '') {
        window.location.href = `/search?q=${encodeURIComponent(searchInput)}`;
      }
    });
  }

  // Load search results
  if (window.location.pathname === '/search') {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    
    if (query) {
      const searchQueryDisplay = document.getElementById('search-query-display');
      const searchResultsList = document.getElementById('search-results-list');
      
      searchQueryDisplay.textContent = `Showing results for: "${query}"`;
      
      fetch(`/api/courses/search?q=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            searchResultsList.innerHTML = '';
            
            if (data.courses.length === 0) {
              searchResultsList.innerHTML = '<li>No courses found matching your search.</li>';
              return;
            }
            
            data.courses.forEach(course => {
              const li = document.createElement('li');
              li.innerHTML = `
                <strong>Course Name:</strong> ${course.name}
                <br>
                <strong>Teacher:</strong> ${course.teacher ? course.teacher.name : 'Unknown'}
                <br>
                <span>Schedule: ${course.schedule}</span>
                <br>
                <a href="/login" class="login-to-enroll">Login to enroll</a>
              `;
              searchResultsList.appendChild(li);
            });
          } else {
            console.error('Failed to search courses:', data.message);
          }
        })
        .catch(error => {
          console.error('Error:', error);
          searchResultsList.innerHTML = '<li>An error occurred while searching. Please try again.</li>';
        });
    }
  }

  // Add logout functionality
  const navLinks = document.querySelector('.nav-links');
  if (token && navLinks) {
    // Check if we need to update the navigation based on authentication
    const isOnAuthPage = window.location.pathname === '/student-dashboard' || 
                         window.location.pathname === '/teacher-dashboard';
    
    if (isOnAuthPage) {
      // Find the login link and replace it with the username
      const loginLink = navLinks.querySelector('a[href="/login"]');
      if (loginLink) {
        const parentLi = loginLink.parentElement;
        parentLi.innerHTML = '<a href="#" id="logout">Logout</a>';
      }
      
      // Add Dashboard link if not already present
      const dashboardLink = navLinks.querySelector('a[href="/student-dashboard"]') || 
                          navLinks.querySelector('a[href="/teacher-dashboard"]');
      
      if (!dashboardLink) {
        const dashboardLi = document.createElement('li');
        if (userType === 'student') {
          dashboardLi.innerHTML = '<a href="/student-dashboard">Dashboard</a>';
        } else if (userType === 'teacher') {
          dashboardLi.innerHTML = '<a href="/teacher-dashboard">Dashboard</a>';
        }
        navLinks.appendChild(dashboardLi);
      }
      
      // Add event listener to logout link
      const logoutLink = document.getElementById('logout');
      if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
          e.preventDefault();
          localStorage.removeItem('token');
          localStorage.removeItem('userType');
          window.location.href = '/';
        });
      }
      
      // Load appropriate courses based on user type
      if (userType === 'student') {
        loadStudentCourses();
      } else if (userType === 'teacher') {
        loadTeacherCourses();
      }
    }
  }

  // Add registration link to login page
  const loginContainer = document.querySelector('.login-container');
  if (loginContainer && !document.querySelector('.register-link')) {
    const registerLink = document.createElement('p');
    registerLink.className = 'register-link';
    registerLink.innerHTML = 'Don\'t have an account? <a href="/register">Register</a>';
    loginContainer.appendChild(registerLink);
  }
});