'use strict'

process.title = 'your second phone'

// third-party dependencies
var config = require('config')
var express = require('express')
var compression = require('compression')
var timeout = require('connect-timeout')
var logger = require('morgan')
var spdy = require('spdy')
var sio = require('socket.io')
var helmet = require('helmet')
var expressPeerServer = require('peer').ExpressPeerServer
// internal dependencies
var basic = require('./basic')
var coordinator = require('./coordinator')

var app = express()
const hostname = config.get('hostname')
const secure_port = config.get('ports.secure')

var fs = require('fs')
var ssl = {}
ssl.key = fs.readFileSync(config.get('ssl.key'))
ssl.cert = fs.readFileSync(config.get('ssl.cert'))
if (config.has('ssl.ca')) {
  ssl.ca = config.get('ssl.ca').map(function (_p) {
    return fs.readFileSync(_p)
  })
}
ssl.ca = config.get('ssl.ca')
var server = spdy.createServer(ssl, app)
fs = undefined
ssl = undefined

app.use(function startup (req, res, next) {
  if (/^\/(about|privacy|terms|donate)?$/.test(req.path)) {
    let d = new Date()
    res.locals.current_year = d.getUTCFullYear()
  }
  next()
})

app.use(helmet.xframe('deny'))
app.use(helmet.hsts({
  // one year
  maxAge: (1000 * 60 * 60 * 24 * 7 * 4.345 * 12),
  includeSubdomains: true,
  preload: true
}))
app.use(helmet.hidePoweredBy())

app.use(function redirectToSecure (req, res, next) {
  if (req.secure) {
    next()
  } else {
    res.redirect(301, `https://${hostname}:${secure_port}/`)
  }
})

app.locals = {
  page_id: 'unknown',
  ga: true
}

// Set the views directory
app.set('views', __dirname + '/views')

// Set the view engine to jade
app.set('view engine', 'jade')

// Watch for timeouts
app.use(timeout())

// keep pingdom out of the logs
app.use(function (req, res, next) {
  if ((/pingdom/i).test(req.get('user-agent'))) {
    return res.send(200)
  }

  next()
})

// Let's save some bandwidth and load time
app.use(compression())

// Set the static resoureces directory
app.use(express.static(__dirname + '/../public'))

// mount peer server on express
// keep this north of the logger!
app.use('/peers', expressPeerServer(server))

// Let's do some logging
app.use(logger('combined'))

// Done with middleware - wire up routes
app.get('/source', function (req, res) {
  res.redirect('https://github.com/nkcmr/yoursecondphone')
})
app.get('/issues', function (req, res) {
  res.redirect('https://github.com/nkcmr/yoursecondphone/issues')
})
app.get('/about', basic.render('about'))
app.get('/donate', basic.render('donate'))
app.get('/privacy', basic.render('privacy'))
app.get('/terms', basic.render('terms'))
app.get('/', basic.index)

app.use(basic.render('not_found', 404))
app.use(basic.server_error)

// mount socket.io on the express server (under /coordinator)
var io = sio(server, {
  path: '/coordinator'
})

// register events
coordinator(io)

// listen and redirect on unsecured http
require('http').createServer(app).listen(config.get('ports.unsecure'))

// listen on secure SPDY/3.1
server.listen(config.get('ports.secure'), '::')
