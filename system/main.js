'use strict';

process.title = 'your second phone';

// third-party dependencies
var express = require('express'),
    compression = require('compression'),
    timeout = require('connect-timeout'),
    logger = require('morgan'),
    spdy = require('spdy'),
    sio = require('socket.io'),
    helmet = require('helmet'),
    expressPeerServer = require('peer').ExpressPeerServer;

// node.js dependencies
var http = require('http');

// internal dependencies
var basic = require('./basic'),
    config = require('../ysp_config'),
    coordinator = require('./coordinator');

var app = express(),
    server = spdy.createServer(config.ssl, app);

app.use(helmet.xframe('deny'));
app.use(helmet.hsts({
  // one year
  maxAge: (1000 * 60 * 60 * 24 * 7 * 4.345 * 12),
  includeSubdomains: true
}));
app.use(helmet.hidePoweredBy());

app.locals = {
  show_ad: false,
  page_id: 'unknown',
  ga: true
};

// Set the views directory
app.set('views', __dirname + '/views');

// Set the view engine to jade
app.set('view engine', 'jade');

// Watch for timeouts
app.use(timeout());

// keep pingdom out of the logs
app.use(function(req, res, next) {
  if ((/pingdom/i).test(req.get('user-agent')))
    return res.send(200);

  next();
});

// Let's save some bandwidth and load time
app.use(compression());

// Set the static resoureces directory
app.use(express.static(__dirname + '/../public'));

// mount peer server on express
// keep this north of the logger!
app.use('/peers', expressPeerServer(server));

// Let's do some logging
app.use(logger('combined'));

// Done with middleware - wire up routes
app.get('/source', function(req, res) {
  res.redirect('https://github.com/yoursecondphone/yoursecondphone');
});
app.get('/issues', function(req, res) {
  res.redirect('https://github.com/yoursecondphone/yoursecondphone/issues');
});
app.get('/about', basic.render('about'));
app.get('/donate', basic.render('donate'));
app.get('/privacy', basic.render('privacy'));
app.get('/terms', basic.render('terms'));
app.get('/', basic.index);

app.use(basic.render('not_found', 404));
app.use(basic.server_error);

// mount socket.io on the express server (under /coordinator)
var io = sio(server, {
  path: '/coordinator'
});

// register events
coordinator(io);

// listen and redirect on unsecured http
require('http').Server(app).listen(80);

// listen on secure SPDY/3.1
server.listen(443);
