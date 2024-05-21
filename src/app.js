// const express = require('express');
// require('dotenv').config();
// const bodyParser = require('body-parser');
// const authRoutes = require('./routes/authRoutes');


// const PORT = process.env.PORT || 3000;

// const app = express();

// app.use(bodyParser.json());

// app.use('/auth', authRoutes);

// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });


const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
const axios = require('axios');


const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'e75896045d3054dee12bd86a3852f9b204032f9ba7cfb89129705b44b4835533';
const EARTH_RADIUS_KM = 6371; // Earth radius in kilometers


const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'Home_Services'
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL');
});

app.use(express.json());

app.post('/register', async (req, res) => {
    try {
        const { username, password, role, serviceType, latitude, longitude, contactNumber, email } = req.body;

        // Check if the username already exists in the database
        const existingUser = await getUserByUsername(username);
        if (existingUser) {
            return res.status(400).send('User already exists');
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the user into the database
        const sql = 'INSERT INTO users (username, password, role, serviceType, latitude, longitude, contactNumber, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        db.query(sql, [username, hashedPassword, role, serviceType, latitude, longitude, contactNumber, email], (err, result) => {
            if (err) {
                console.error('Error registering user:', err);
                return res.status(500).send('Internal Server Error');
            }
            res.status(201).send('User registered successfully');
        });
    } catch (err) {
        console.error('Error registering user:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Function to get user by username
async function getUserByUsername(username) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM users WHERE username = ?';
        db.query(sql, [username], (err, result) => {
            if (err) {
                return reject(err);
            }
            if (result.length > 0) {
                resolve(result[0]);
            } else {
                resolve(null);
            }
        });
    });
}
  

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const sql = 'SELECT * FROM users WHERE username = ?';
        db.query(sql, [username], async (err, result) => {
            if (err) {
                console.error('Error logging in:', err);
                res.status(500).send('Internal Server Error');
                return;
            }

            if (result.length === 0) {
                res.status(401).send('Invalid username or password');
                return;
            }

            const user = result[0];
            const isValidPassword = await bcrypt.compare(password, user.password);

            if (!isValidPassword) {
                res.status(401).send('Invalid username or password');
                return;
            }

            // Exclude the password from the user object
            delete user.password;

            // Generate JWT token
            const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY);

            // Send the user object and JWT token along with the response
            res.send({ user, token });
        });
    } catch (err) {
        console.error('Error logging in:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Route for searching nearby service providers
// app.post('/search/providers', async (req, res) => {
//     try {
//         const { serviceType } = req.body;
        
//         // Query the database for service providers
//         const sql = 'SELECT * FROM users WHERE role = ? AND serviceType = ?';
//         db.query(sql, ['service_provider', serviceType], async (err, results) => {
//             if (err) {
//                 console.error('Error searching for service providers:', err);
//                 res.status(500).send('Internal Server Error');
//                 return;
//             }
            
//             res.send(results);
//         });
//     } catch (err) {
//         console.error('Error searching for service providers:', err);
//         res.status(500).send('Internal Server Error');
//     }
// });

/**
 * @returns Name, ServiceType and distance
 * Invalid token Error
 */
// app.post('/search/providers', async (req, res) => {
//     try {
//         const { latitude, longitude, radius, serviceType } = req.body;
        
//         // Verify the token
//         const token = req.headers.authorization;
//         if (!token) {
//             return res.status(401).send('Unauthorized: No token provided');
//         }
//         jwt.verify(token, SECRET_KEY, (err, decoded) => {
//             if (err) {
//                 return res.status(401).send('Unauthorized: Invalid token');
//             }
//             // Token is valid, proceed with the search for service providers
//             // Query the database for service providers matching serviceType
//             const sql = 'SELECT * FROM users WHERE role = ? AND serviceType = ? AND SQRT(POW(69.1 * (latitude - ?), 2) + POW(69.1 * (? - longitude) * COS(latitude / 57.3), 2)) < ?';
//             db.query(sql, ['service_provider', serviceType, latitude, longitude, radius], async (err, results) => {
//                 if (err) {
//                     console.error('Error searching for service providers:', err);
//                     res.status(500).send('Internal Server Error');
//                     return;
//                 }
                
//                 // Calculate distance for each service provider and store in the result
//                 results.forEach(provider => {
//                     const dLat = deg2rad(provider.latitude - latitude);
//                     const dLon = deg2rad(provider.longitude - longitude);
//                     const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//                               Math.cos(deg2rad(latitude)) * Math.cos(deg2rad(provider.latitude)) *
//                               Math.sin(dLon / 2) * Math.sin(dLon / 2);
//                     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//                     const distance = R * c; // Distance in kilometers
//                     provider.distance = distance;
//                 });
                
//                 // Sort the results by distance in descending order
//                 results.sort((a, b) => parseFloat(b.distance) - parseFloat(a.distance));
                
//                 // Send the sorted results to the client
//                 res.send(results);
//             });
//         });
//     } catch (err) {
//         console.error('Error searching for service providers:', err);
//         res.status(500).send('Internal Server Error');
//     }
// });

// search-providers
app.post('/search/providers', async (req, res) => {
    try {
        const { latitude, longitude, serviceType } = req.body;
        
        // Query the database for service providers matching the specified service type
        const sql = `
            SELECT id, username, serviceType, latitude, longitude, 
            SQRT(POW(69.1 * (? - latitude), 2) + POW(69.1 * (? - longitude) * COS(latitude / 57.3), 2)) AS distance 
            FROM users 
            WHERE role = ? AND serviceType = ? 
            HAVING distance <= 50
            ORDER BY distance
        `;
        db.query(sql, [latitude, longitude, 'service_provider', serviceType], async (err, results) => {
            if (err) {
                console.error('Error searching for service providers:', err);
                res.status(500).send('Internal Server Error');
                return;
            }

            res.send(results);
        });
    } catch (err) {
        console.error('Error searching for service providers:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Function to convert degrees to radians
function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// Send Notification API
app.post('/sendNotifications', async (req, res) => {
    try {
      const { serviceType } = req.body;
    
      // Query the database for nearby service providers with the same service type
      const sql = 'SELECT id FROM users WHERE role = ? AND serviceType = ?';
      db.query(sql, ['service_provider', serviceType], async (err, results) => {
        if (err) {
          console.error('Error searching for service providers:', err);
          res.status(500).send('Internal Server Error');
          return;
        }
        
        // For each nearby service provider, create and insert a notification
        const notificationMessage = `New service request for ${serviceType} nearby. Check your app for details.`;
        const insertNotificationSql = 'INSERT INTO notifications (user_id, message) VALUES (?, ?)';
        results.forEach(provider => {
          db.query(insertNotificationSql, [provider.id, notificationMessage], (err, result) => {
            if (err) {
              console.error('Error inserting notification:', err);
              return;
            }
            console.log('Notification inserted successfully:', result);
          });
        });
        
        res.status(200).send('Notifications sent successfully');
      });
    } catch (err) {
      console.error('Error sending notifications:', err);
      res.status(500).send('Internal Server Error');
    }
  });
  
// Fetch unread notifications for a user
app.get('/notifications', async (req, res) => {
    try {
      const { userId } = req.body;
  
      // Query the database for unread notifications for the user
      const sql = 'SELECT * FROM notifications WHERE user_id = ? AND is_read = 0';
      db.query(sql, [userId], async (err, results) => {
        if (err) {
          console.error('Error querying database:', err);
          res.status(500).send('Internal Server Error');
          return;
        }
  
        // Mark notifications as read
        // Update the 'is_read' flag in the database for these notifications
  
        // Send the notifications to the client
        res.status(200).json(results);
      });
    } catch (err) {
      console.error('Error fetching notifications:', err);
      res.status(500).send('Internal Server Error');
    }
  });
  
  // Update notification status (mark as read)
  app.put('/notifications/:notificationId', async (req, res) => {
    try {
      const { notificationId } = req.params;
  
      // Update the 'is_read' flag in the database for the specified notification
      const sql = 'UPDATE notifications SET is_read = 1 WHERE id = ?';
      db.query(sql, [notificationId], async (err, result) => {
        if (err) {
          console.error('Error updating notification status:', err);
          res.status(500).send('Internal Server Error');
          return;
        }
  
        res.status(200).send('Notification status updated successfully');
      });
    } catch (err) {
      console.error('Error updating notification status:', err);
      res.status(500).send('Internal Server Error');
    }
  });

  
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});