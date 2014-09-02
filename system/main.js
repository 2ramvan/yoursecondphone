process.title = 'your second phone';
var express, compression, timeout, logger, spdy, http, basic, middleware, config, sio, io, server, app, helmet;

// third-party dependencies
express = require('express');
compression = require('compression');
timeout = require('connect-timeout');
logger = require('morgan');
spdy = require('spdy');
sio = require('socket.io');
helmet = require('helmet');

// node.js dependencies
http = require('http');

// internal dependencies
basic = require('./basic');
middleware = require('./middleware');
config = require('../ysp_config');
coordinator = require('./coordinator');

app = express();

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

// Never allow unsecured HTTP requests on anything, always redirect to HTTPS
app.use(middleware.redirect_to_secure());

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

server = spdy.createServer(config.ssl, app).listen(443);

io = sio(server, {
  path: '/coordinator'
});
coordinator(io);

http.Server(app).listen(80);
(require('peer').PeerServer)({
  port: 8080,
  ssl: config.ssl,
  path: '/peers',
  origins: 'https://yoursecondphone.co'
});
server.listen(443);