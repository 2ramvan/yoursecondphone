// Dependencies
require("sugar");
var express = require("express");
var _ = require("lodash");
var async = require("async");
var cache = require("lru-cache");
var argv = require("optimist").argv;
var uaparser = require("ua-parser-js");
var i18n = require("i18next");

var http = require("http");
var https = require("https");
var crypto = require("crypto");
var fs = require("fs");
var path = require("path");

// Modules
var util = require(path.join(__dirname, "util.js"));
var routes = require(path.join(__dirname, 'routes'));

//Declar top-scope variable
var server, events;

// Initializa server
server = express();

// Set global view data
server.locals = {
	no_crawl_index: false,
	show_ad: false,
	page_id: "unknown",
	ga: true
};


server.set('views', path.join(__dirname, 'views'));
server.set("view engine", "jade");
server.use(express.timeout());
server.use(express.static(path.join(__dirname, 'public')));
server.use(express.cookieParser());
server.use(express.cookieSession({
	key:"ysp_session",
	secret:"changeme",
	cookie: {
		maxAge: 1000 * 60 * 60 * 24
	}
}));

server.use(function(req, res, next){
	console.log(req.acceptedLanguages);
	next();
});

server.use(function(req, res, next){
	// Parse the user-agent, find out if browser is compatible
	var parser = new uaparser();
	req.ua = (parser.setUA(req.get("User-Agent"))).getResult();

	if (_.contains(["Chrome", "Firefox", "Chromium"], req.ua.browser.name)) {
		if(_.contains(["Chrome", "Chromium"], req.ua.browser.name)) {
			if(parseInt(req.ua.browser.major) >= 26) {
				res.locals.compatible_browser = true;
			}
		} else if (req.ua.browser.name == "Firefox") {
			if(parseInt(req.ua.browser.major) >= 22) {
				res.locals.compatible_browser = true;
			}
		}
	}

	next();
});

server.get("/static/js/lang.json", function(req, res){
	res.set("Content-type", "application/json");
	res.json(200, {
		hello: "world"
	})
});
server.get("/:sid?", routes.index);



https.createServer({
	key: fs.readFileSync("./ssl/server.key"),
	cert: fs.readFileSync("./ssl/server.crt"),
	ca: [fs.readFileSync("./ssl/AddTrustExternalCARoot.crt"), fs.readFileSync("./ssl/PositiveSSLCA2.crt")]
}, server).listen(443);