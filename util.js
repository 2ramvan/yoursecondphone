exports.randomSessionID = function(){
	var consonants = "bcdfghjklmnpqrstvwxyz";
	var vowels = "aeiou";

	var out = "";

	for (var i = 0; i < 8; i++) {
		switch ( i%2 ) {
			case 0:
				out += consonants.charAt(Math.round(Math.random()*20));
				break;
			default:
				out += vowels.charAt(Math.round(Math.random()*4));
				break;
		}
	}

	return out;
};