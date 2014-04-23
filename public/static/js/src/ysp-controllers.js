(function(global){
	'use strict';
	
	angular.module("ysp-controllers", ["ngStorage", "ngSanitize", "Scope.safeApply"])

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
			"browser-incompatible": "Your browser is not capable of making video calls, please use the latest version of <a target='_blank' href='https://www.google.com/chrome'>Google Chrome</a>, <a target='_blank' href='https://www.mozilla.org/firefox'>Firefox</a> or <a target='_blank' href='http://www.opera.com/'>Opera</a>",
			"unavailable-id": "The conversation ID you were attempting to use is not available."
		};

		$scope.error_id = $routeParams.err_type;
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

	.controller("RootCtrl", ["$log", "$scope", "GumService", "chance", "$location", "$localStorage", function($log, $scope, GumService, chance, $location, $localStorage){

		$scope.current_step = 1;

		$scope.room_name = "";
		$scope.valid_room_name = true;

		$scope.$watch("room_name", function(newVal, oldVal) {
			if(newVal == ""){
				$scope.valid_room_name = true;
				return;
			}

			$scope.valid_room_name = newVal.match(/^\w(\w|-){1,20}$/);
		})

		$scope.initGum = function() {
			GumService.once("active", function() {
				$scope.current_step += 1;
				$scope.$safeApply();
			});
			GumService.invoke();
		}

		$scope.launchRoom = function() {
			$log.debug("Launching room... %s", $scope.room_name);

			if(!$scope.valid_room_name){
				$scope.room_name = chance.word({ length: 8 });
			}

			$location.path("/" + $scope.room_name); // Pass application over to Room
			$scope.$safeApply();
		}

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

	.controller("RoomCtrl", ["$log", "$scope", "GumService", "$location", "$routeParams", "$localStorage", "negotiator", "ApplicationError", "PeerWrapper", "peer", function($log, $scope, GumService, $location, $routeParams, $localStorage, negotiator, ApplicationError, PeerWrapper, peer){

		$scope.room_id = $routeParams.room_id;
		$scope.peers = [];

		// preflight check
		async.waterfall([
			GumService.isInvoked,
			function(isGumInvoked, callback) {
				if(isGumInvoked)
					return callback(null);
				else
					GumService.once("active", function() {
						callback(null);
					});
					GumService.invoke();
			},
			function(callback) {
				if(negotiator.isReady()){
					callback(null);
				}else{
					negotiator.once("ready", function() {
						callback(null);
					});
				}
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
					$scope.peers.push(new PeerWrapper.forgeFromConnections(dc, mc));
					$scope.$safeApply();
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

					var new_peer = new PeerWrapper.forgeFromConnections(dc, mc);
					new_peer.on("close", function(id) {
						$scope.peers = $scope.peers.filter(function(peer) {
							return peer.id != id;
						});
						$scope.$safeApply();
					});

					$scope.peers.push(new PeerWrapper.forgeFromConnections(dc, mc));
					$scope.$safeApply();
				}
			})

			$scope.peers = roomies.map(function(peer_id) {
				return new PeerWrapper(peer_id);
			});
			$scope.$safeApply();

			global.foo = $scope;
		});

	}]);

})(this);