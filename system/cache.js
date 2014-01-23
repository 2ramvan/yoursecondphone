process.title = "ysp cache";

var LRU = require("lru-cache");
var debug = require("debug")("ysp:cache");
var messenger = require("messenger");

debug("cache online...");

var cache = LRU({
	max: 500,
	maxAge: 1000 * 60 * 60 * 24
});

var comms = messenger.createListener(9921);

comms.on("cache:get", function(m, data) {
	debug("cache:get - %s", data);

	var a = cache.get(data);

	m.reply(a);
});
comms.on("cache:has", function(m, data) {
	debug("cache:has - %s", data);

	var a = cache.has(data);

	m.reply(a);
});
comms.on("cache:set", function(m, data) {
	debug("cache:set - %s", data.key);

	var a = cache.set(data.key, data.val);
});
comms.on("cache:del", function(m, data) {
	debug("cache:del - %s", data);
	if (cache.has(data)) {
		cache.del(data);
	}
});
