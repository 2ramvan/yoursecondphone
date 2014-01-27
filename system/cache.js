process.title = "Your Second Phone - cache.js";

console.log("what the fuck")

var LRU = require("lru-cache");
var debug = require("debug")("cache");
var flic = require("flic");
var Master = flic.master;
var Slave = flic.slave;
// var messenger = require("messenger");

debug("cache online...");

var cache = LRU({
	max: 500,
	maxAge: 1000 * 60 * 60 * 24
});

var master = new Master();

var cache_slave = new Slave("cache", function(err){
	if(err) throw err;
});

cache_slave.on("get", function(key, callback){
	var val = cache.get(key);
	callback(null, val);
});

cache_slave.on("has", function(key, callback){
	var haz = cache.has(key);
	callback(null, haz);
});

cache_slave.on("set", function(key, val, callback){
	cache.set(key, val);
	callback(null);
});

cache_slave.on("del", function(key, callback){
	cache.del(key);
	callback(null);
});