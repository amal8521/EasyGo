const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/connection');

  
async function registerUser(req, res) {
  try {

    console.log("register_creds__", username + "__" + password);
    const { username, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const sql = 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)';
    db.query(sql, [username, hashedPassword, role], (err, result) => {
      if (err) {
        console.error('Error registering user:', err);
        res.status(500).send('Internal Server Error');
        return;
      }
      res.status(201).send('User registered successfully');
    });
  } catch (err) {
    console.error('Error registering user:', err);
    res.status(500).send('Internal Server Error');
  }
}

async function loginUser(req, res) {
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

      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.SECRET_KEY);
      res.send({ token });
    });
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).send('Internal Server Error');
  }
}

module.exports = {
  registerUser,
  loginUser
};