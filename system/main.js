process.title = 'your second phone';
var express, compression, timeout, logger, spdy, http, basic, middleware, config, sio, io, server, app;

// third-party dependencies
express = require('express');
compression = require('compression');
timeout = require('connect-timeout');
logger = require('morgan');
spdy = require('spdy');
sio = require('socket.io');

// node.js dependencies
http = require('http');

// internal dependencies
basic = require(__dirname + '/basic.js');
middleware = require(__dirname + '/middleware.js');
config = require(__dirname + '/../ysp_config.js');
coordinator = require(__dirname + '/coordinator.js');

app = express();

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

// Enable Strict Transport Security; max age possible.
// http://en.wikipedia.org/wiki/HTTP_Strict_Transport_Security
app.use(middleware.set_strict_transport_security());

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
app.use(logger('short'));

// Done with middleware - wire up routes
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
  origins: 'yoursecondphone.co:443'
});
server.listen(443);