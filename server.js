// COMP2406 Final Project
// Moataz Dabbour

const https = require('https')
const express = require('express')
const path = require('path')
const routes = require('./routes/index')
const  app = express() 
const PORT = process.env.PORT || 3000

// Powered by Merriam Webster Dictionary ©
const dAPI = 'b18a07af-****-****-****-b5714d034dde'
const tAPI = 'c56dcf79-****-****-****-cd80a7c751f4'


// some logger middleware functions
function methodLogger(request, response, next){
		   console.log("METHOD LOGGER") 
		   console.log("================================")
		   console.log("METHOD: " + request.method)
		   console.log("URL:" + request.url)
		   next(); //call next middleware registered
}


function define(request, response) {

	let username = routes.getUser(request);
	let word = request.body['word'];
	let action = request.body['ID']
	let actionDesc = 'Definitions'
	let doc = 'define'

	if (!word) {response.render('define',{
		title: 'LEX',
		status: 'EMPTY FIELD',
		definition: []
	} )}

	if (request.body['word'].length > 0) {

		console.log(request.body);

	let options = { 
		method: "GET",
		host: 'dictionaryapi.com',
		path: `/api/v3/references/${action}/json/${word}?key=${dAPI}`,
		headers: { "useQueryString": true }
	}
	if (action == 'thesaurus') {
		doc = 'synon'
		actionDesc = 'Synonyms'
		options.path = `/api/v3/references/${action}/json/${word}?key=${tAPI}`
	}

	https.request(options, function(apiRes) {

		let data = ''
		apiRes.on('data', (chunk)=> { 
			data += chunk
		})
	

	// Upon end of response from API
	apiRes.on('end', function() { 

		let wordObj = JSON.parse(data)

		// DEBUG
		// console.log(wordObj);

		// No Meta information ~ Unknown Word
		if (!wordObj[0].meta){

			response.render(`${doc}`, {status: "Nothing found.", title: "LEX - Not Found"})

		} else {

		let respObj = {
			title: 'LEX - Lookup',
			status: `${actionDesc} of: ${word}`,
			definition: wordObj
		}

		if (action == 'thesaurus') {
			respObj.title = 'LEX - Lookup'
			respObj.definition = wordObj[0].meta.syns[0]
		}
		// Add to DB
		routes.updateHistory(username, word);

		// Render response
		response.render(`${doc}`, respObj)
		}

	})

	}).end()

	}}


// ## EXPRESS ##
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs') 
app.locals.pretty = true //to generate pretty view-source code in browser

// ## Middleware ##
// register middleware with dispatcher
app.use(methodLogger)
app.use(express.urlencoded());
app.use(express.json());

// Registration Route before Auth.
app.post('/register', routes.register)

app.use(routes.authenticate); //authenticate user


// ## Routes ## 
app.post('/define', define)
app.post('/getsyn', define)
app.post('/delete', routes.delete)
app.post('/delusers', routes.deleteUsers)

app.get('/define', (request,response)=> {response.render('define', {title: 'LEX - Dictionary'})})
app.get('/findsyn', (request,response)=> {response.render('synon', {title: 'LEX - Thesaurus'})})
app.get('/users', routes.users)
app.get('/history', routes.history)

// Net
app.get('/', (request,response) => { 
	response.render('index')
})

// Start Server
app.listen(PORT, err => {
  if(err) console.log(err)
  else {

		console.log(`Server listening on port: ${PORT} CNTL:-C to stop`)
		console.log(`To Test:`)
		console.log('(As Admin) user: admin password: pass')
		console.log('(As Guest) user: temp password: temp')
		console.log('http://localhost:3000/')

	}
})
