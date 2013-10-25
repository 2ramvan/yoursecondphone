var path = require("path");
var _ = require("lodash");
module.exports = function(language){
	var out;
	var en = require(path.join(__dirname, "/en.json"));
	if(language != "en") {
		out = _.extend(en, require(path.join(__dirname, "/{1}.json".assign(language))));
	}

	return out;
};