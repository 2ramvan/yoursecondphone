var _ = require("lodash");
var async = require("async");
var express = require("express");
var https = require("https");
var http = require("http");
var fs = require("fs");

var mw = require("./middleware");
var main_routes = require("./routes");
var session = require("./routes/session");

var ysp_config = require("./ysp_config.js");

var server;

exports.init = function(){
	server = express();

	server.locals = {
		no_crawl_index: false,
		show_ad: false,
		page_id: "unknown",
		ga: true
	};

	server.set('views', "./views");
	server.set("view engine", "jade");
	server.use(express.timeout());
	server.use(function(req, res, next){
		// Enable Strict Transport Security; max age possible.
		// http://en.wikipedia.org/wiki/HTTP_Strict_Transport_Security
		res.set("Strict-Transport-Security", "max-age=31536000");
		next();
	});
	server.use(express.compress());
	server.use(express.static("./public"));
	server.use(express.logger());
	server.use(express.cookieParser());
	server.use(express.cookieSession({
		key:"ysp_session",
		secret: ysp_config.cookie_secret,
		cookie: {
			maxAge: 1000 * 60 * 60 * 24
		}
	}));

	server.use(mw.check_compatibility());
	// server.use(mw.check_for_dnt());

	main_routes(server);
	session(server);

	server.use(function(req, res, next){
		res.status(404);

		if(req.accepts("html")) {
			res.render("not_found", {
				page_id: "not_found"
			});
		}
	});

	server.use(function(err, req, res, next){
		res.status(500);
		res.render("server_error", {
			page_id: "server_error"
		});
	});
};
exports.run = function(){
	// All unsecured HTTP requests need to be redirected to the secure server
	var redirecter = express();
	redirecter.all("*", function(req, res){
		res.redirect("https://yoursecondphone.co" + req.url);
		return;
	});
	http.createServer(redirecter).listen(ysp_config.unsecure_port);

	https.createServer({
		key: fs.readFileSync("./ssl/server.key"),
		cert: fs.readFileSync("./ssl/server.crt"),
		ca: [fs.readFileSync("./ssl/AddTrustExternalCARoot.crt"), fs.readFileSync("./ssl/PositiveSSLCA2.crt")]
	}, server).listen(ysp_config.secure_port);
};