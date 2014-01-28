process.title = "Your Second Phone - web-worker.js";

var root = __dirname.split("/");
var root_dir = "";
root.shift();
root.pop();
for (var i = 0; i < root.length; i++) {
	root_dir += "/" + root[i];
}
// Libraries
var express = require("express"),
	fs = require("fs"),
	debug = require("debug")("ysp:web-worker"),
	sessions = require("client-sessions"),
// Helpers
	session = require(root_dir + "/system/session.js"),
	basic = require(root_dir + "/system/basic.js"),
	middleware = require(root_dir + "/system/middleware.js");

var server = express();

server.locals = {
	no_crawl_index: false,
	show_ad: false,
	page_id: "unknown",
	ga: true
};

// Set the views directory
server.set('views', root_dir + "/system/views");

// Set the view engine to jade
server.set("view engine", "jade");

// Watch for timeouts
server.use(express.timeout());

// Never allow unsecured HTTP requests on anything, always redirect to HTTPS
server.use(middleware.redirect_to_secure());

// Enable Strict Transport Security; max age possible.
// http://en.wikipedia.org/wiki/HTTP_Strict_Transport_Security
server.use(middleware.set_strict_transport_security());

// Let's save some bandwidth and load time
server.use(express.compress());

// Let's do some logging
server.use(express.logger());	

// Set the static resoureces directory
server.use(express.static(root_dir + "/public"));

server.use(express.cookieParser());

server.use(sessions({
	cookieName: "ysp",
	requestKey: "session",
	secret: process.env.COOKIE_SECRET,
	duration: 24 * 60 * 60 * 1000,
	cookie: {
		httpOnly: true
	}
}));

server.use(function(req, res, next){
	debug("cookie: %j", req.session);
	next();
});

// Check if user is capable of making WebRTC calls
server.use(middleware.check_compatibility());

// Done with middleware - wire up routes

server.get("/about", basic.about);
server.get("/donate", basic.donate);
server.get("/privacy", basic.privacy);
server.get("/terms", basic.terms);
server.get(/^\/([b-df-hj-np-tv-z][aeiou][b-df-hj-np-tv-z][aeiou][b-df-hj-np-tv-z][aeiou][b-df-hj-np-tv-z][aeiou])?$/, basic.index);

// Create a session
server.post("/session", session.store);

// Show a session
server.get("/session/:sid", session.show);

server.use(basic.not_found);
server.use(basic.server_error);

require("http").createServer(server).listen(process.env.UNSECURE_PORT || 80);
require("https").createServer({
	key: fs.readFileSync(root_dir + "/system/ssl/server.key"),
	cert: fs.readFileSync(root_dir + "/system/ssl/server.crt"),
	ca: [fs.readFileSync(root_dir + "/system/ssl/AddTrustExternalCARoot.crt"), fs.readFileSync(root_dir + "/system/ssl/PositiveSSLCA2.crt")]
}, server).listen(process.env.SECURE_PORT || 443);