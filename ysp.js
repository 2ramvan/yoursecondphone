// Dependencies
require("sugar");
var express = require("express");
var _ = require("lodash");
var async = require("async");
var cache = require("lru-cache");
var argv = require("optimist").argv;

var http = require("http");
var https = require("https");
var crypto = require("crypto");
var fs = require("fs");
var path = require("path");

// Modules
var routes = require(path.join(__dirname, 'routes'));

var server, events;

server = express();
server.set('views', path.join(__dirname, 'views'));
server.set("view engine", "jade");
server.use(express.static(path.join(__dirname, 'public')));


server.get("/", routes.index);

https.createServer({
	key: fs.readFileSync("./ssl/server.key"),
	cert: fs.readFileSync("./ssl/server.crt"),
	ca: [fs.readFileSync("./ssl/AddTrustExternalCARoot.crt"), fs.readFileSync("./ssl/PositiveSSLCA2.crt")]
}, server).listen(443);