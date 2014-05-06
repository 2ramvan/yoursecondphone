process.title = "Your Second Phone - web-worker.js";

// Libraries
var express = require("express"),
	spdy = require("spdy");

var basic = require(__dirname + "/basic.js"),
	middleware = require(__dirname + "/middleware.js");

var config = require(__dirname + '/../ysp_config.js');

var server = express();

server.locals = {
	show_ad: false,
	page_id: "unknown",
	ga: true
};

// Set the views directory
server.set('views', __dirname + "/views");

// Set the view engine to jade
server.set("view engine", "jade");

// Watch for timeouts
server.use(express.timeout());

// Never allow unsecured HTTP requests on anything, always redirect to HTTPS
server.use(middleware.redirect_to_secure());

// Enable Strict Transport Security; max age possible.
// http://en.wikipedia.org/wiki/HTTP_Strict_Transport_Security
server.use(middleware.set_strict_transport_security());

// keep pingdom out of the logs
server.use(function(req, res, next) {
	if(req.get("user-agent").match(/pingdom/i))
		return res.send(200);

	next();
})

// Let's save some bandwidth and load time
server.use(express.compress());

// Set the static resoureces directory
server.use(express.static(__dirname + "/../public"));

// Let's do some logging
server.use(express.logger());	

// Done with middleware - wire up routes
server.get("/about", basic.render("about"));
server.get("/donate", basic.render("donate"));
server.get("/privacy", basic.render("privacy"));
server.get("/terms", basic.render("terms"));
server.get("/", basic.index);

server.use(basic.render("not_found", 404));

server.use(basic.server_error);

require("http").createServer(server).listen(process.env.UNSECURE_PORT || 80);
spdy.createServer(config.ssl.main_server, server).listen(process.env.SECURE_PORT || 443);