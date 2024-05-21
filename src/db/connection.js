const mysql = require('mysql2');
const { dbHost, dbUser, dbPassword, dbName } = require('./config');


const db = mysql.createConnection({
    // not getting the .env value here
  host: "localhost",
  user: "root",
  password: "root",
  database: "Home_Services"


// host: dbHost,
// user: dbUser,
// password: dbPassword,
// database: dbName

});

// Connect to MySQL database
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL');
});

module.exports = db;
