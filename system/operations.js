global.pwd = __dirname;
var _ = require("lodash");
var async = require("async");
var express = require("express");
var util = require("util");
var fs = require("fs");
var debug = require("debug")("ysp:operations");

var mw = require(pwd + "/middleware");
var main_routes = require(pwd + "/routes");
var session = require(pwd + "/routes/session");

var cluster = require("cluster");
var domain = require("domain");

// if(cluster.isMaster){
// 	process.title = "ysp web worker master";
// 	var numCPUs = require('os').cpus().length;

// 	for (var i = numCPUs - 1; i >= 0; i--) {
// 		cluster.fork();
// 	};

// 	cluster.on('exit', function(worker, code, signal) {
// 		console.log('worker ' + worker.process.pid + ' died');
// 		cluster.fork();
// 	});
// }else{
	process.title = util.format("ysp web worker: %d", cluster.worker.id)
	var server = express();

	server.locals = {
		no_crawl_index: false,
		show_ad: false,
		page_id: "unknown",
		ga: true
	};

	server.set('views', __dirname + "/views");
	server.set("view engine", "jade");
	server.use(express.timeout());
	server.use(function(req, res, next){
		res.set("X-Powered-By", "The tears of PHP developers")

		if(req.secure){
			next();
		}else {
			debug("Unsecure request; redirecting...");
			res.redirect(301, "https://yoursecondphone.co" + req.url);
		}
	});
	server.use(function(req, res, next){
		res.set("Strict-Transport-Security", "max-age=31536000");
		next();
	});
	server.use(express.compress());
	server.use(express.static("./public"));
	server.use(express.logger());
	server.use(function(req, res, next){
		debug("worker %d: Incoming HTTP Request", cluster.worker.id);
		next();
	});
	server.use(express.cookieParser());
	server.use(express.cookieSession({
		key:"ysp_session",
		secret: process.env.COOKIE_SECRET,
		cookie: {
			maxAge: 1000 * 60 * 60 * 24
		}
	}));

	server.use(mw.check_compatibility());

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
		console.error(err);

		res.status(500);
		res.render("server_error", {
			page_id: "server_error"
		});
	});

	var unsecure_server = require("http").createServer(server).listen(process.env.UNSECURE_PORT || 80);
	var secure_server = require("https").createServer({
		key: fs.readFileSync(__dirname + "/ssl/server.key"),
		cert: fs.readFileSync(__dirname + "/ssl/server.crt"),
		ca: [fs.readFileSync(__dirname + "/ssl/AddTrustExternalCARoot.crt"), fs.readFileSync(__dirname + "/ssl/PositiveSSLCA2.crt")]
	}, server).listen(process.env.SECURE_PORT || 443);
// }