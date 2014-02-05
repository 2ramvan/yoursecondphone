process.title = "Your Second Phone - cache.js";

var LRU = require("lru-cache");
var debug = require("debug")("ysp:cache");
var flic = require("flic");
var Bridge = flic.bridge;
var Node = flic.node;

debug("cache online...");

var cache = LRU({
	max: 500,
	maxAge: 1000 * 60 * 60 * 24
});

var bridge = new Bridge();

var cache_node = new Node("cache", function(err){
	if(err) throw err;
});

cache_node.on("get", function(key, callback){
	var val = cache.get(key);
	callback(null, val);
});

cache_node.on("has", function(key, callback){
	var haz = cache.has(key);
	callback(null, haz);
});

cache_node.on("set", function(key, val, callback){
	cache.set(key, val);
	callback(null);
});

cache_node.on("del", function(key, callback){
	cache.del(key);
	callback(null);
});