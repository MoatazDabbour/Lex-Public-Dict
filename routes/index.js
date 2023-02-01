

const url = require('url')
const sqlite3 = require('sqlite3').verbose() //verbose provides more detailed stack trace
const db = new sqlite3.Database('data/maindb')


db.serialize(function() {
  let sqlString = "CREATE TABLE IF NOT EXISTS users (userid TEXT PRIMARY KEY, password TEXT, role TEXT)"
  db.run(sqlString)
  sqlString = "INSERT OR REPLACE INTO users VALUES ('admin', 'pass', 'admin')"
  db.run(sqlString)
  sqlString = "INSERT OR REPLACE INTO users VALUES ('temp', 'temp', 'guest')"
  db.run(sqlString)
  sqlString = "CREATE TABLE IF NOT EXISTS hist (user TEXT references users (userid), search TEXT PRIMARY KEY)"

  db.run(sqlString)

})


// DONE
exports.register = function (request, response, next) { 

  console.log("\nRegistration Attempt:");
  console.log("User:" , request.body['user'],", Password:", request.body['pwd'])

  if (request.body['pwd'].length > 0 && request.body['user'].length > 0) { 
    sqlString = `INSERT OR REPLACE INTO users VALUES ('${request.body['user']}', '${request.body['pwd']}', 'guest')`
    db.run(sqlString);

    console.log('\nRegistration sent to DB');

    response.render('regsucc', {status: 'Registration Success', title: 'LEX - Register' })
    
  } else {

    console.log('## Registration not sent to DB ');

    response.render('regsucc', {status: 'Registration Not Successful', title: 'LEX - Register' })

  }

}


exports.updateHistory = function (user, word) { 

	let sqlString;
	sqlString = `INSERT OR REPLACE INTO hist (user, search) VALUES ('${user}','${word}')`
	db.run(sqlString)

}

exports.delete = function (request, response)  {
  let username = getUser(request);

	let sqlString;
	sqlString = "DELETE from hist WHERE user='" + username + "'"
	db.run(sqlString)
  response.render('history', {
    title: 'LEX - History'}
    )
}

exports.deleteUsers = function (request, response)  {

  let sqlString;
	sqlString = "DELETE from users WHERE role='guest'"
	db.run(sqlString)

  db.all("SELECT userid, password, role FROM users", function(err, rows) {

    response.render('users', {
      title: 'LEX ADMIN',
      userEntries: rows
    })

  })
}


exports.users = function(request, response) {

  if (request.role == 'admin'){

  db.all("SELECT userid, password, role FROM users", function(err, rows) {

    response.render('users', {
      title: 'LEX ADMIN',
      userEntries: rows
    })

  })

  } else { 

    response.render('index', {status: "ADMIN NEEDED"})

  }
}


exports.history = function(request, response) { 

  let username = getUser(request);
  console.log("History request: ", username)
  let sql = "SELECT search, user FROM hist WHERE user='" + username + "'"

  db.all(sql, function(err, rows) {
    response.render('history', {
      title: 'LEX - History',
      search: rows
    })
  })

}

// Finished
function getUser(request) { 

  let auth = request.headers.authorization
  let tmp = auth.split(' ')
  var buf = Buffer.from(tmp[1], 'base64');
  let plain_auth = buf.toString()
  let credentials = plain_auth.split(':') // split on a ':'
  let username = credentials[0]

  return username;

}


exports.getUser = getUser


exports.authenticate = function(request, response, next) {

  let regResp = '<!DOCTYPE html>\
  <html>\
  <head> \
    <title> LEX - Register </title>\
    <style>\
    body {\
      font-family: "Times New Roman", Times, serif;\
    }\
    button {\
        border-radius: 10px;\
        padding: 10px;\
        background: #05406e;\
        color: #fff;\
    }\
    p[id="status"] {\
        font-weight: 700;\
    }\
  </style>\
  </head>\
  <body>\
     <h1> Register </h1>\
  <div> \
    <form action="/register" method= "POST" >\
    <label for="user">Username:</label><br>\
    <input type="text" id="user" name="user"><br>\
    <label for="pwd">Password:</label><br>\
    <input type="password" id="pwd" name="pwd">\
    <button name="register" value="Register">Register</button>\
  </form> \
  </div>\
  <p>Already have an account?</p>\
  <form action="/" method= "GET" >\
  <button>Login</button>\
  </form>\
  </body>\
  </html>'

  let auth = request.headers.authorization
  if (!auth) {

    response.setHeader('WWW-Authenticate', 'Basic realm="need to login"')
    response.writeHead(401, {
      'Content-Type': 'text/html'
    })

    response.write(regResp)
    console.log('No auth on entry')
    response.end()

  } else {
    
    console.log("Authorization Header: " + auth)

    let tmp = auth.split(' ')
    var buf = Buffer.from(tmp[1], 'base64');
    let plain_auth = buf.toString()
    let credentials = plain_auth.split(':') 
    let username = credentials[0]
    let password = credentials[1]
    var authorized = false;
    
   
    db.all("SELECT userid, password, role FROM users", function(err, rows) {

      for (let i = 0; i < rows.length; i++) {
        if (rows[i].userid == username & rows[i].password == password){

          let user = rows[i].userid
          console.log(`User Found: ${user}`, new Date());
          authorized = true;
          request.role = rows[i].role;

        }
      }

      if (authorized == false) {
        response.setHeader('WWW-Authenticate', 'Basic realm="need to login"')
        response.writeHead(401, {
          'Content-Type': 'text/html'
        })

        response.write(regResp)
        console.log('No auth found')
        response.end()

      } else next()
    })
  }
}

function parseURL(request, response) {
  const PARSE_QUERY = true //parseQueryStringIfTrue
  const SLASH_HOST = true //slashDenoteHostIfTrue
  let urlObj = url.parse(request.url, PARSE_QUERY, SLASH_HOST)
  console.log('path:')
  console.log(urlObj.path)
  console.log('query:')
  console.log(urlObj.query)
  return urlObj
}
