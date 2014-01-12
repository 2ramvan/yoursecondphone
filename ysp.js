require("sugar");
var cluster = require("cluster");
var LRU = require("lru-cache");
var numCPUs = require('os').cpus().length;
var messenger = require("messenger");

if (cluster.isMaster) {
	// Start the cache
	var cache = LRU({
		max: 500,
		maxAge: 1000 * 60 * 60 * 24
	});

	var worker_event = messenger.createListener(9921);

	worker_event.on("cache:get", function(m, data) {
		m.reply(cache.get(data));
	});
	worker_event.on("cache:has", function(m, data) {
		m.reply(cache.has(data));
	});
	worker_event.on("cache:set", function(m, data) {
		m.reply(cache.set(data.key, data.val));
	});
	worker_event.on("cache:del", function(m, data) {
		if (cache.has(data)) {
			m.reply(cache.del(data));
		}
	});

	for (var i = 0; i < numCPUs; i++) {
		cluster.fork();
	}

	cluster.on("exit", function(worker, code, signal) {
		console.error("MAJOR ERROR: worker died. Spawining new worker...");
		cluster.fork();
	});
}

if (cluster.isWorker) {
	var operations = require("./operations");

	operations.init();
	operations.run();
}