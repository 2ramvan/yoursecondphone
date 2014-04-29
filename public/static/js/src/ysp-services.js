(function(global){
	'use strict';
	
	angular.module("ysp-services", ["ngStorage", "btford.socket-io"])

/*
                                        
oo.ooooo.   .ooooo.   .ooooo.  oooo d8b 
 888' `88b d88' `88b d88' `88b `888""8P 
 888   888 888ooo888 888ooo888  888     
 888   888 888    .o 888    .o  888     
 888bod8P' `Y8bod8P' `Y8bod8P' d888b    
 888                                    
o888o                                   
                                        
 */

	.service("peer", ["$log", "negotiator_host", "signaler_port", "ApplicationError", function($log, negotiator_host, signaler_port, ApplicationError) {
		var peer = new Peer({
			host: negotiator_host,
			port: signaler_port,
			secure: true
		});

		peer.on("open", function(id) {
			$log.debug("main peer connection open (%s)", id);
		});

		peer.on("close", function() {
			$log.debug("main peer connection closed");
		});

		peer.on("error", function(err) {
			$log.error("main peer error: ", err.type, err);
			new ApplicationError(err.type);
		});

		peer.on("connection", function() {
			$log.debug("main peer incoming connection");
		});

		peer.on("call", function() {
			$log.debug("main peer incoming call");
		});

		global.pr = peer;

		return peer;
	}])

/*

                                         oooo                      .   
                                         `888                    .o8   
             .oooo.o  .ooooo.   .ooooo.   888  oooo   .ooooo.  .o888oo 
            d88(  "8 d88' `88b d88' `"Y8  888 .8P'   d88' `88b   888   
            `"Y88b.  888   888 888        888888.    888ooo888   888   
            o.  )88b 888   888 888   .o8  888 `88b.  888    .o   888 . 
ooooooooooo 8""888P' `Y8bod8P' `Y8bod8P' o888o o888o `Y8bod8P'   "888" 

 */

	.factory("_socket", ["socketFactory", "negotiator_host", "negotiator_port", function(socketFactory, negotiator_host, negotiator_port) {
		var socket = io.connect("https://" + negotiator_host + ":" + negotiator_port);

		global.skt = socket;

		return socketFactory({
			ioSocket: socket
		});
	}])

/*

                                               .    o8o                .                      
                                             .o8    `"'              .o8                      
ooo. .oo.    .ooooo.   .oooooooo  .ooooo.  .o888oo oooo   .oooo.   .o888oo  .ooooo.  oooo d8b 
`888P"Y88b  d88' `88b 888' `88b  d88' `88b   888   `888  `P  )88b    888   d88' `88b `888""8P 
 888   888  888ooo888 888   888  888   888   888    888   .oP"888    888   888   888  888     
 888   888  888    .o `88bod8P'  888   888   888 .  888  d8(  888    888 . 888   888  888     
o888o o888o `Y8bod8P' `8oooooo.  `Y8bod8P'   "888" o888o `Y888""8o   "888" `Y8bod8P' d888b    
                      d"     YD                                                               
                      "Y88888P'                                                               
                                                                                              
 */

	.factory("negotiator", ["$log", "_socket", "ApplicationError", function($log, _socket, ApplicationError) {
		var is_ready_state = false;
		var exports = new EventEmitter();

		_socket.on("peer_left", function(id) {
			exports.emit("peer_left", id);
		})

		function advertise_peer_id(peer_id){
			$log.debug("advertising peer_id to negotiator...");

			var cb = function(err) {
				$log.debug("peer_id successfully advertised...")
				is_ready_state = true;
				exports.emit("ready");
			}

			if(_socket.open){
				_socket.emit("peer_id", peer_id, cb);
			}else{
				_socket.once("connect", function() {
					_socket.emit("peer_id", peer_id, cb);
				})
			}
		}

		function join_room(room_id, cb) {
			if(is_ready_state){
				_socket.emit("join_room", room_id, function(err, roomies) {
					exports.emit("join");
					(cb || angular.noop).call(this, err, roomies);
				});
			}else{
				throw new Error("Must publish peer_id before joining room");
			}
		}

		function leave_room(room_id) {
			if(is_ready_state){
				_socket.emit("leave_room", room_id);
			}
		}

		function isReady() {
			return is_ready_state;
		}

		exports.advertise_peer_id = advertise_peer_id;
		exports.join_room = join_room;
		exports.leave_room = leave_room;
		exports.isReady = isReady;

		return exports;
	}])

/*

ooooooooo.                                oooooo   oooooo     oooo                                                             
`888   `Y88.                               `888.    `888.     .8'                                                              
 888   .d88'  .ooooo.   .ooooo.  oooo d8b   `888.   .8888.   .8'   oooo d8b  .oooo.   oo.ooooo.  oo.ooooo.   .ooooo.  oooo d8b 
 888ooo88P'  d88' `88b d88' `88b `888""8P    `888  .8'`888. .8'    `888""8P `P  )88b   888' `88b  888' `88b d88' `88b `888""8P 
 888         888ooo888 888ooo888  888         `888.8'  `888.8'      888      .oP"888   888   888  888   888 888ooo888  888     
 888         888    .o 888    .o  888          `888'    `888'       888     d8(  888   888   888  888   888 888    .o  888     
o888o        `Y8bod8P' `Y8bod8P' d888b          `8'      `8'       d888b    `Y888""8o  888bod8P'  888bod8P' `Y8bod8P' d888b    
                                                                                       888        888                          
                                                                                      o888o      o888o                         
                                                                                                                               
 */

	.factory("PeerWrapper", ["$log", "peer", "GumService", "chance", "$interval", "$timeout", "negotiator",
	 function($log, peer, GumService, chance, $interval, $timeout, negotiator) {

		var senders = {
			"event": function() {
				// lets send an event to a remote peer

				var msg = {};
				var args = Array.prototype.slice.call(arguments);
				msg.type = "event"; // yup, its and event
				msg.event_name = args.shift(); // pull off the event name

				// if there is a function at the end of the arguments
				if(typeof args[args.length - 1] == "function"){
					// pull it off
					var callback = args.pop();

					// give it an id
					var cb_id = chance.string({ length: 20, pool: "abcdefghijklmnopqrstuvwxyz" });

					// store it for later
					this.waiting_cbs[cb_id] = callback; // this refers to the peerwrapper just to avoid confusion
					msg.cb_id = cb_id; // make sure the receiver knows the callback to call
				}

				msg.args = args;

				// happy trails event!
				this.dc.send(msg);
			},
			message: function(content) {
				var msg = {};
				msg.type = "message";
				msg.content = content;

				this.dc.send(msg);
			}
		}

		function PeerWrapper(peer_id, dc, mc){
			var self = this;

			// keep track of consecutive dc errors
			// if the ticker reaches 10, kill
			var accumulated_dc_errors = 0;

			this.id = peer_id;

			// remote callbacks waiting queue
			this.waiting_cbs = {};

			this.dc = dc || peer.connect(peer_id); // either store passed in dataconnection or connect
																						 // to the peer
			this.mc = mc || peer.call(peer_id, GumService.getMediaStream()); // same here
			this.ms = null; // mediastream goes here

			// MediaConnection handlers
			this.mc.on("stream", function(stream) {
				$log.debug("peer-mc(%s) 'stream' event", self.id);
				self.ms = stream;
				self.emit("stream", stream);
			});

			this.mc.on("error", function(err) {
				$log.error("peer-mc(%s) error: ", self.id, err);
				self.emit("error-mc", err);
			});

			// DataConnection handlers
			this.dc.on("data", function(data) {
				accumulated_dc_errors = 0;

				if(typeof data == "object"){
					if(data.type == "event"){

						// if there is a callback_id create a callback function
						// that will acknowledge
						if(!!data.cb_id){
							var cb = function() {
								// all pretty self-explanatory
								var msg = { type: "cb", cb_id: data.cb_id };

								var args = Array.prototype.slice.call(arguments);
								msg.args = args;

								self.dc.send(msg);
							}
						}

						var args = data.args || [];
						args.push(cb || angular.noop); // push the callback to the end
						args.unshift(data.event_name); // push the event name to the beginning

						// emit that sucka!!
						self.emit.apply(self, args);
					}

					// hooray! the callback has been acknowledged
					if(data.type == "cb"){
						// call it and remove it from the queue
						(self.waiting_cbs[data.cb_id] || angular.noop).apply(self, data.args);
						delete self.waiting_cbs[data.cb_id];
					}

					// send this back, pronto!!
					if(data.type == "heartbeat"){
						self.dc.send({ type: "heartbeat_reply", hb_id: data.hb_id });
					}

					if(data.type == "message"){
						self.emit("message", data.content);
					}
				}

				self.emit("data", data);
			});

			this.dc.on("open", function() {
				$log.debug("peer-dc(%s) open", self.id);
				self.emit("open");
			});

			this.dc.on("close", function() {
				$log.debug("peer-dc(%s) close", self.id);
				self.emit("close", self.id);
			});

			this.dc.on("error", function(err) {
				accumulated_dc_errors += 1;
				$log.error("peer-dc(%s)", self.id);
				self.emit("error-dc", err);

				if(accumulated_dc_errors > 10){
					self.close();
				}
			});
		}
		PeerWrapper.prototype = _.clone(EventEmitter.prototype);

		PeerWrapper.forgeFromConnections = function(dc, mc) {
			// this will be used to create a PeerWrapper from just the
			// incoming connections

			// answer the call automatically
			mc.answer(GumService.getMediaStream());

			// do i really need a comment for this
			return new PeerWrapper(dc.peer, dc, mc);
		};

		PeerWrapper.prototype.send = function() {
			var self = this;
			var args = Array.prototype.slice.call(arguments);

			// pull the send type off of the arguments
			var send_type = args.shift();

			// check if sender is valid
			if(!senders[send_type]){

				// this is mostly an internal api, so misusing it is inexcusable
				throw new Error("Invalid Sender!");
			}else{

				// call the sender
				senders[send_type].apply(self, args);
			}
		}

		PeerWrapper.prototype.close = _.once(function() {
			var self = this;

			// log for science
			$log.debug("close called...");

			// shutdown all connections
			this.mc.close();
			this.dc.close();

			// let everyone know this peer is done for
			this.emit("close", this.id);

			// give everyone time to receive the 'close' event
			// then detach all listeners
			$timeout(function() {
				self.removeAllListeners();
				self.dc.removeAllListeners();
				self.mc.removeAllListeners();
			}, 500);
		});

		return PeerWrapper;
	}])

/*

  .oooooo.                                   .oooooo..o                                 o8o                      
 d8P'  `Y8b                                 d8P'    `Y8                                 `"'                      
888           oooo  oooo  ooo. .oo.  .oo.   Y88bo.       .ooooo.  oooo d8b oooo    ooo oooo   .ooooo.   .ooooo.  
888           `888  `888  `888P"Y88bP"Y88b   `"Y8888o.  d88' `88b `888""8P  `88.  .8'  `888  d88' `"Y8 d88' `88b 
888     ooooo  888   888   888   888   888       `"Y88b 888ooo888  888       `88..8'    888  888       888ooo888 
`88.    .88'   888   888   888   888   888  oo     .d8P 888    .o  888        `888'     888  888   .o8 888    .o 
 `Y8bood8P'    `V88V"V8P' o888o o888o o888o 8""88888P'  `Y8bod8P' d888b        `8'     o888o `Y8bod8P' `Y8bod8P' 

 */

	.service("GumService", ["$log", "$rootScope", "ApplicationError", function($log, $rootScope, ApplicationError){
		var ms = null;
		var isInvoked = false;

		function Gum(){}
		Gum.prototype = _.clone(EventEmitter.prototype)

		Gum.prototype.invoke = function gum_invoke() {
			var self = this;

			if(!_.isFunction(getUserMedia))
				return new ApplicationError("browser-incompatible");

			if(!!ms && isInvoked)
				throw new Error("Gum already invoked!");

			getUserMedia({ video: true, audio: true }, function(stream) {
				ms = stream;
				isInvoked = true;
				self.emit("active", ms);
			}, function(err) {
				isInvoked = false;
				self.emit("error", err);
			})
		}

		Gum.prototype.revoke = function gum_revoke() {
			if(!!ms){
				ms.stop();
			}

			isInvoked = false;
			self.emit("inactive");
		}

		Gum.prototype.getMediaStream = function() {
			return ms;
		}

		Gum.prototype.isInvoked = function(callback) {
			(callback || angular.noop).call(this, null, isInvoked);
			return isInvoked;
		}

		var gum = new Gum();

		gum.on("error", function() {
			return new ApplicationError("no-webcam");
		});

		return gum;
	}])

	.service("chance", [function() {
		return new Chance();
	}])

})(this);