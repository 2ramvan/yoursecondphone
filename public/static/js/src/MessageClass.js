define([], function(){
	var Message = function(direction, msg){
		this.direction = direction;
		this.msg = msg;
		this.datetime = Date.create();
	};

	return Message;
});