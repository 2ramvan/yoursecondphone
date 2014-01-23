process.title = "ysp core";
global.pwd = __dirname;

require("sugar");
var cp = require("child_process");

var LRU = require("lru-cache");
var numCPUs = require('os').cpus().length;
var messenger = require("messenger");
var debug = require("debug")("ysp:core");

debug("Online...");

var cache = cp.fork("system/cache.js");
var operations = cp.fork("system/operations.js");

// operations.on("message", function(){})

// if (cluster.isMaster) {
// 	// Start the cache

// 	if(numCPUs < 2) numCPUs = 2;

// 	for (var i = 0; i < numCPUs; i++) {
// 		cluster.fork();
// 	}

// 	cluster.on("exit", function(worker, code, signal) {
// 		debug("Cluster Error! Forking new cluster...");
// 		cluster.fork();
// 	});

// 	cluster.on("online", function(worker){
// 		debug("Cluster %d Online!", worker.id);
// 	});
// }

// if (cluster.isWorker) {
// 	var operations = require("./operations");

// 	operations.init();
// 	operations.run();
// }