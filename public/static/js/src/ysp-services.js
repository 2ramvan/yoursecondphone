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

	.service("peer", ["$log", "negotiator_host", "signaler_port", function($log, negotiator_host, signaler_port) {
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
			$log.error("main peer error: ", err);
		});

		peer.on("connection", function() {
			$log.debug("main peer incoming connection");
		});

		peer.on("call", function() {
			$log.debug("main peer incoming call");
		});

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

		function isReady() {
			return is_ready_state;
		}

		exports.advertise_peer_id = advertise_peer_id;
		exports.join_room = join_room;
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

	.factory("PeerWrapper", ["$log", "peer", "GumService", "chance", "$interval", "$timeout", function($log, peer, GumService, chance, $interval, $timeout) {

		var senders = {
			"event": function() {
				var msg = {};
				var args = Array.prototype.slice.call(arguments);
				msg.type = "event";
				msg.event_name = args.shift();

				if(typeof args[args.length - 1] == "function"){
					var callback = args.pop();
					var cb_id = chance.string({ length: 20, pool: "abcdefghijklmnopqrstuvwxyz" });
					this.waiting_cbs[cb_id] = callback;
					msg.cb_id = cb_id;
				}

				msg.args = args;
				this.dc.send(msg);
			}
		}

		var calculatePeerHealth = function(round_trip_ms) {
			return 100 - ((100/2500) * round_trip_ms);
		}

		function PeerWrapper(peer_id, dc, mc){
			var self = this;
			var timeouts = 0;
			this.peerConnectionHealth = 100;

			this.id = peer_id;
			this.waiting_cbs = {};
			this.dc = dc || peer.connect(peer_id);
			this.mc = mc || peer.call(peer_id, GumService.getMediaStream());

			// MediaConnection handlers
			this.mc.on("stream", function(stream) {
				$log.debug("peer-mc(%s) 'stream' event", self.id);
				self.emit("stream", stream);
			});

			// WebRTC close events are unreliable - use heartbeats
			// this.mc.on("close", function() {
			// 	$log.debug("peer-mc(%s) closed", self.id);
			// 	self.emit("close", "mc");
			// });

			this.mc.on("error", function(err) {
				$log.error("peer-mc(%s) error: ", self.id, err);
				self.emit("error-mc", err);
			});

			// DataConnection handlers
			this.dc.on("data", function(data) {
				if(typeof data == "object"){
					if(data.type == "event"){
						if(!!data.cb_id){
							var cb = function() {
								var msg = { type: "cb", cb_id: data.cb_id };

								var args = Array.prototype.slice.call(arguments);
								msg.args = args;

								self.dc.send(msg);
							}
						}

						var args = data.args || [];
						args.push(cb);
						args.unshift(data.event_name);

						self.emit.apply(self, args);
					}

					if(data.type == "cb"){
						(self.waiting_cbs[data.cb_id] || angular.noop).apply(self, data.args);
						delete self.waiting_cbs[data.cb_id];
					}

					if(data.type == "heartbeat"){
						self.dc.send({ type: "heartbeat_reply" });
					}
				}

				self.emit("data", data);
			});

			this.dc.on("open", function() {
				$log.debug("peer-dc(%s) open", self.id);
				self.emit("open");
			});

			// WebRTC close events are unreliable - using heartbeats instead.
			// this.dc.on("close", function() {
			// 	$log.debug("peer-dc(%s) close", self.id);
			// 	self.emit("close", "dc");
			// });

			this.dc.on("error", function(err) {
				$log.error("peer-dc(%s)", self.id);
				self.emit("error-dc", err);
			});

			var heartbeat = $interval(function() {
				var timeoutAfter = 2000;
				// Let's send heartbeats for reliable termination of dead clients
				
				var killer = $timeout(function() {
					var timeoutsAllowed = 2;
					// lets keep track of timeouts and officially close after 3 consecutive timeouts
					// not trying to jump the gun and kill peers at the first sign of trouble
					if(timeouts >= timeoutsAllowed){
						if(!!heartbeat){
							killHeartbeat();
							$log.error("peer(%s) timed out. closing connection...", self.id);
							self.close("timed-out");
						}
					}else{
						self.peerConnectionHealth = 0;
						$log.warn("peer(%s) timed out. giving the peer %d more chance(s) to reply", self.id, timeoutsAllowed - timeouts);
						timeouts++;
					}
				}, timeoutAfter, self); //Give the peer 2 seconds to reply;

				self.dc.once("data", function(data) {
					if(data.type == "heartbeat_reply"){
						// mark the end time
						var end = Date.now();

						// reset timeouts counter
						timeouts = 0;

						// cancel the execution
						$timeout.cancel(killer);

						// calculate peer connection health
						var round_trip_time = (end - start);
						self.peerConnectionHealth = Math.round(100 - (( 100 / timeoutAfter ) * round_trip_time));

						// log, for science
						// $log.debug("peer heartbeat!\nround trip: %dms\nconnection health: %d", round_trip_time, self.peerConnectionHealth);
					}
				});

				function killHeartbeat(){
					$interval.cancel(heartbeat);
					heartbeat = undefined;
				}

				// send the heartbeat
				self.dc.send({ type: "heartbeat" });

				// mark the start time
				var start = Date.now();
			}, 1000, this);
		}
		PeerWrapper.prototype = _.clone(EventEmitter.prototype);

		PeerWrapper.forgeFromConnections = function(dc, mc) {

			mc.answer(GumService.getMediaStream());

			return new PeerWrapper(dc.peer, dc, mc);
		};

		PeerWrapper.prototype.send = function() {
			var self = this;
			var args = Array.prototype.slice.call(arguments);
			var send_type = args.shift();

			if(!senders[send_type]){
				throw new Error("Invalid Sender!");
			}else{
				senders[send_type].apply(self, args);
			}
		}

		PeerWrapper.prototype.close = _.once(function() {
			$log.debug("close called...");
			this.emit("close", this.id);
			this.mc.close();
			this.dc.close();
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
			ApplicationError("no-webcam");
		});

		return gum;
	}])

	.service("chance", [function() {
		return new Chance();
	}])

})(this);