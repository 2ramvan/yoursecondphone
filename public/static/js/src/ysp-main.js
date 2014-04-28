(function(global){
	'use strict';
	
	angular.module("ysp", ["ysp-services", "ysp-controllers", "ysp-directives", "ngRoute", "ngSanitize", "ngStorage", "Scope.safeApply"])

	.constant("negotiator_host", "negotiate.ysp.im")
	.constant("negotiator_port", 9091)
	.constant("signaler_port", 9090)
	.value("fullscreen", screenfull)

	.config(["$routeProvider", function($routeProvider) {
		
		$routeProvider.when("/", {
			controller: "RootCtrl",
			templateUrl: "/static/views/root.html"
		});

		$routeProvider.when("/error/:err_type", {
			controller: "ErrorCtrl",
			templateUrl: "/static/views/error.html"
		});

		$routeProvider.when("/:room_id", {
			controller: "RoomCtrl",
			templateUrl: "/static/views/room.html"
		});

		$routeProvider.otherwise({
			redirectTo: "/"
		});

	}])

	.run(["$log", "peer", "negotiator", function($log, peer, negotiator) {
		// lets expose a global toolbox and settings that can be modified in order
		// to debug things like heartbeats and stuff.
		global.ysp_debug = {};

		if(peer.open){
			negotiator.advertise_peer_id(peer.id);
		}else{
			peer.on("open", function(id) {
				negotiator.advertise_peer_id(id);
			});
		}
	}])

	.factory("ApplicationError", ["$log", "$location", "$rootScope", function($log, $location, $rootScope) {

		function ApplicationError(type){
			if(!this instanceof ApplicationError) return new ApplicationError(type);

			Error.call(this, arguments);
			this.name = "ApplicationError";
			this.type = type;
			this.message = type || "unknown-error";

			$log.error("ApplicationError - %s", type);
			$location.url("/error/" + type);
			$rootScope.$safeApply();
		}
		ApplicationError.prototype = new Error();
		ApplicationError.prototype.constructor = ApplicationError;

		return ApplicationError;
	}])

})(this);