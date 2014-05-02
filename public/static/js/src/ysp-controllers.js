(function(global){
	'use strict';
	
	angular.module("ysp-controllers", ["ngSanitize", "Scope.safeApply"])

/*

oooooooooooo                                        .oooooo.       .            oooo  
`888'     `8                                       d8P'  `Y8b    .o8            `888  
 888         oooo d8b oooo d8b  .ooooo.  oooo d8b 888          .o888oo oooo d8b  888  
 888oooo8    `888""8P `888""8P d88' `88b `888""8P 888            888   `888""8P  888  
 888    "     888      888     888   888  888     888            888    888      888  
 888       o  888      888     888   888  888     `88b    ooo    888 .  888      888  
o888ooooood8 d888b    d888b    `Y8bod8P' d888b     `Y8bood8P'    "888" d888b    o888o 

 */

	.controller("ErrorCtrl", ["$log", "$scope", "$routeParams", function($log, $scope, $routeParams){
		var error_descriptions = {
			"no-webcam": "Your Second Phone was denied access to the webcam!",
			"server-error": "Your Second Phone is unable to communicate with the server. Please try again in a few minutes.",
			"browser-incompatible": "Your browser is not capable of making video calls, please use the latest version of <a target='_blank' href='https://www.google.com/chrome'>Google Chrome</a>, <a target='_blank' href='https://www.mozilla.org/firefox'>Firefox</a> or <a target='_blank' href='http://www.opera.com/'>Opera</a>",
			"ssl-unavailable": "An error was encountered while attempting to establish a secure connection with the server",
			"socket-error": "An unexpected error occured while trying to negotiate a connection."
		};

		$scope.error_id = error_descriptions.hasOwnProperty($routeParams.err_type) ? $routeParams.err_type : "unknown-error";
		$scope.error_description = error_descriptions[$scope.error_id] || "An unknown error has occured.";

	}])

/*

ooooooooo.                           .     .oooooo.       .            oooo  
`888   `Y88.                       .o8    d8P'  `Y8b    .o8            `888  
 888   .d88'  .ooooo.   .ooooo.  .o888oo 888          .o888oo oooo d8b  888  
 888ooo88P'  d88' `88b d88' `88b   888   888            888   `888""8P  888  
 888`88b.    888   888 888   888   888   888            888    888      888  
 888  `88b.  888   888 888   888   888 . `88b    ooo    888 .  888      888  
o888o  o888o `Y8bod8P' `Y8bod8P'   "888"  `Y8bood8P'    "888" d888b    o888o 

 */

	.controller("RootCtrl", ["$log", "$scope", "GumService", "chance", "$location", "supportsRealTimeCommunication", "negotiator", "$timeout", function($log, $scope, GumService, chance, $location, supportsRealTimeCommunication, negotiator, $timeout){
		$scope.current_step = 0;

		if(supportsRealTimeCommunication()){
			$scope.current_step = 1;
		}else{
			$scope.current_step = -1;
		}

		$scope.room_name = "";
		$scope.valid_room_name = true;

		$scope.$watch("room_name", function(newVal, oldVal) {
			if(newVal === ""){
				$scope.valid_room_name = true;
				return;
			}

			$scope.valid_room_name = newVal.match(/^\w(\w|-){1,30}$/);
		});

		$scope.loading_gum = false;

		$scope.initGum = function() {
			$scope.loading_gum = true;
			GumService.once("active", function() {
				$scope.current_step += 1;
				$scope.$safeApply();
			});
			GumService.invoke();
		};

		$scope.loading_room = false;
		$scope.error_message = "";
		$scope.launchRoom = function() {
			$scope.loading_room = true;
			$log.debug("Launching room... %s", $scope.room_name);

			if(!$scope.valid_room_name || $scope.room_name == ""){
				$scope.room_name = chance.word({ length: 8 });
			}

			negotiator.room_exists($scope.room_name, function(exists) {
				$scope.loading_room = false;
				if(exists){
					$scope.error_message = "Sorry, that room name is already taken.";
					$scope.$safeApply();
					$timeout(function() {
						$scope.error_message = "";
					}, 5000);
				}else{
					$location.path("/" + $scope.room_name);
					$scope.$safeApply();
				}
			});
		};

	}])

/*

ooooooooo.                                           .oooooo.       .            oooo  
`888   `Y88.                                        d8P'  `Y8b    .o8            `888  
 888   .d88'  .ooooo.   .ooooo.  ooo. .oo.  .oo.   888          .o888oo oooo d8b  888  
 888ooo88P'  d88' `88b d88' `88b `888P"Y88bP"Y88b  888            888   `888""8P  888  
 888`88b.    888   888 888   888  888   888   888  888            888    888      888  
 888  `88b.  888   888 888   888  888   888   888  `88b    ooo    888 .  888      888  
o888o  o888o `Y8bod8P' `Y8bod8P' o888o o888o o888o  `Y8bood8P'    "888" d888b    o888o 

 */

	.controller("RoomCtrl", ["$log", "$scope", "GumService", "$location", "$routeParams", "negotiator", "ApplicationError", "PeerWrapper", "peer", "fullscreen", "chance", "$rootScope", "supportsRealTimeCommunication", function($log, $scope, GumService, $location, $routeParams, negotiator, ApplicationError, PeerWrapper, peer, fullscreen, chance, $rootScope, supportsRealTimeCommunication){

		if(!supportsRealTimeCommunication()){
			return new ApplicationError("browser-incompatible", true);
		}

		$scope.room_id = $routeParams.room_id;
		$scope.room_link = "http://ysp.im/#/" + $routeParams.room_id;
		$scope.peers = [];
		$scope.messages = [];
		$scope.draft = "";
		$scope.showMessages = true;

		$scope.isFullscreen = false;

		// ng-class helper that plainly states the number of peers connected
		$scope.getNumPeers = function() {
			var nums = ["zero", "one", "two"];
			return nums[$scope.peers.length];
		};

		// ng-class helper that helps the peer holders determine the correct column size
		$scope.getColumnSize = function() {
			var nums = ["large-12", "large-12", "large-6"];
			return nums[$scope.peers.length];
		};

		// goFullscreen if you need help determining what this does, study code a bit more
		$scope.goFullscreen = function() {
			fullscreen.request(document.querySelector("div#all-streams"));
			$scope.$safeApply();
		};

		$scope.sendMessage = function() {
			if(!!$scope.draft){
				if(!!$scope.peers.length){
					async.each($scope.peers, function(peer, cb) {
						peer.send("message", $scope.draft);
						cb(null);
					}, function(err) {
						pushMessageToScope({
							from: peer.id,
							content: $scope.draft,
							time_received: new Date()
						});

						$scope.draft = "";
						$log.debug("Message sent!");
					});
				}
			}
		};

		function pushMessageToScope(msg){
			// message required fields
			// from
			// time_received
			// content
			// color_code (not-required)
			$scope.messages.push(msg);
			$rootScope.$broadcast("ysp:message");
		}

		// apply the scope when fullscreen state changes
		$(document).on(fullscreen.raw.fullscreenchange, function() {
			$scope.$safeApply();
		});

		// here is where we tear down
		$rootScope.$on("$routeChangeStart", function() {
			negotiator.leave_room($routeParams.room_id);
			negotiator.removeAllListeners();
			$(document).off(fullscreen.raw.fullscreenchange);
		});

		// reflect fullscreen indeicator to the scope
		$scope.$watch(function() {
			return fullscreen.isFullscreen;
		}, function(newVal) {
			$scope.isFullscreen = newVal;
		});

		// preflight check
		async.waterfall([
			function(callback) {
				// lets lump gumservice init and negotiator init in one parallel function
				async.parallel([
					function(callback) {
						if(GumService.isInvoked()){
							return callback(null);
						}else{
							GumService.once("active", function() {
								return callback(null);
							});
							GumService.invoke();
						}
					},
					function(callback) {
						if(negotiator.isReady()){
							callback(null);
						}else{
							negotiator.once("ready", function() {
								callback(null);
							});
						}
					}
				], function(err) {
					callback(null);
				});
			},
			function(callback) {
				negotiator.join_room($scope.room_id, callback);
			}
		], function(err, roomies) {
			if(err)
				return new ApplicationError(err);

			var mc_pool = {}; // Put orphan MediaConnections here, wait for their DirectConnection
			var dc_pool = {}; // visa-versa

			peer.on("call", function(mc) {
				if(!dc_pool.hasOwnProperty(mc.peer)){
					$log.debug("mc(%s) received before dc, waiting...", mc.peer);
					mc_pool[mc.peer] = mc;
				}else{
					$log.debug("mc(%s) arrived!", mc.peer);
					var dc = dc_pool[mc.peer];
					delete dc_pool[mc.peer];

					var new_peer = PeerWrapper.forgeFromConnections(dc, mc);
					attachEventsAndPush(new_peer);
				}
			});

			peer.on("connection", function(dc) {
				if(!mc_pool.hasOwnProperty(dc.peer)){
					$log.debug("dc(%s) received before mc, waiting...", dc.peer);
					dc_pool[dc.peer] = dc;
				}else{
					$log.debug("dc(%s) arrived!", dc.peer);
					var mc = mc_pool[dc.peer];
					delete mc_pool[dc.peer];

					var new_peer = PeerWrapper.forgeFromConnections(dc, mc);
					attachEventsAndPush(new_peer);
				}
			});

			var colors = ["green", "blue", "purple", "orange", "red"];
			var taken_colors = [];

			// this is the entry point for all peers, existing and new
			function attachEventsAndPush(peerWrapper){

				// pick a color for the peer
				do {
					peerWrapper.color_code = chance.pick(colors);
				}while(_.contains(taken_colors, peerWrapper.color_code));

				taken_colors.push(peerWrapper.color_code);

				// once the peer closes up shop, lets do the same and disconnect all events and such
				peerWrapper.once("close", function(id) {

					// relinquish the color
					var i = taken_colors.indexOf(peerWrapper.color_code);
					taken_colors.splice(i, 1);

					$log.debug("peer(%s) closed, pruning...", id);

					// remove it from the array
					$scope.peers = $scope.peers.filter(function(peer) {
						return peer.id != id;
					});
					$scope.$safeApply();
				});

				peerWrapper.on("message", function(message) {
					// form the message
					var msg = {};

					msg.color_code = peerWrapper.color_code;
					msg.content = message;
					msg.time_received = new Date();
					msg.from = peerWrapper.id;

					pushMessageToScope(msg);
					$scope.showMessages = true;
					$scope.$safeApply();
				});

				$scope.peers.push(peerWrapper);
				$scope.$safeApply();
			}

			// this is the primary way of knowing when someone has left
			negotiator.on("peer_left", function(id) {
				
				$scope.peers.forEach(function(peer, index, all_peers){
					if(peer.id == id){
						peer.close();
						all_peers.splice(index, 1);
					}
				});

			});

			negotiator.on("reconnect", function() {
				negotiator.join_room($scope.room_id);
			});

			// process peers given by the negotiator
			roomies.forEach(function(peer_id, index, roomies_internal_ref) {
				var new_peer = new PeerWrapper(peer_id);
				attachEventsAndPush(new_peer);
			});

		});

	}]);

})(this);