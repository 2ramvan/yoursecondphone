process.title = "Your Second Phone - web-worker.js";

// Libraries
var express = require("express"),
	fs = require("fs"),
	spdy = require("spdy");

var basic = require("./basic.js"),
	middleware = require("./middleware.js");

var server = express();

server.locals = {
	show_ad: false,
	page_id: "unknown",
	ga: true
};

// Set the views directory
server.set('views', "./system/views");

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

// Set the static resoureces directory
server.use(express.static("./public"));

// Let's do some logging
server.use(express.logger());	

server.use(express.cookieParser());

// Done with middleware - wire up routes
server.get("/about", basic.render("about"));
server.get("/donate", basic.render("donate"));
server.get("/privacy", basic.render("privacy"));
server.get("/terms", basic.render("terms"));
server.get("/", basic.index);

server.use(basic.render("not_found", 404));

server.use(basic.server_error);

require("http").createServer(server).listen(process.env.UNSECURE_PORT || 80);
spdy.createServer({
	key: fs.readFileSync("/etc/ssl/private/server.encrypted.key"),
	cert: fs.readFileSync("/etc/ssl/private/beta_yoursecondphone_co.crt"),
	ca: [
		fs.readFileSync("/etc/ssl/certs/AddTrustExternalCARoot.crt"),
		fs.readFileSync("/etc/ssl/certs/COMODORSAAddTrustCA.crt"),
		fs.readFileSync("/etc/ssl/certs/COMODORSADomainValidationSecureServerCA.crt")
	]
}, server).listen(process.env.SECURE_PORT || 443);