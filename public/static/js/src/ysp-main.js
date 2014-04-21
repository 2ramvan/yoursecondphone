(function(global){
	'use strict';
	
	function ApplicationError(type){
		Error.call(this, arguments);
		this.name = "ApplicationError";
		this.type = type;
		this.message = type;
	}
	ApplicationError.prototype = new Error();
	ApplicationError.prototype.constructor = ApplicationError;

	angular.module("ysp", ["ngRoute", "ngSanitize"])
	.config(["$routeProvider", function($routeProvider) {
		
		$routeProvider.when("/", {
			controller: "RootCtrl",
			templateUrl: "/static/views/root.html"
		});

		$routeProvider.when("/error/:err_type", {
			controller: "ErrorCtrl",
			templateUrl: "/static/views/error.html"
		});

		$routeProvider.when("/:convo_id", {
			controller: "ConversationCtrl",
			templateUrl: "/static/views/convo.html"
		});

		$routeProvider.otherwise({
			redirectTo: "/"
		});

		return $routeProvider;
	}])

	.controller("ErrorCtrl", ["$log", "$scope", "Peer", "$routeParams", "GumService", function($log, $scope, Peer, $routeParams, GumService) {
		GumService.reset();
		Peer.reset();

		var error_descriptions = {
			"no-webcam": "Your Second Phone was denied access to the webcam!",
			"browser-incompatible": "Your browser is not capable of making video calls, please use the latest version of <a target='_blank' href='https://www.google.com/chrome'>Google Chrome</a>, <a target='_blank' href='https://www.mozilla.org/firefox'>Firefox</a> or <a target='_blank' href='http://www.opera.com/'>Opera</a>",
			"unavailable-id": "The conversation ID you were attempting to use is not available."
		};

		$scope.error_id = $routeParams.err_type;
		$scope.error_description = error_descriptions[$scope.error_id] || "An unknown error has occured.";
	}])

	.controller("ConversationCtrl", ["$log", "$scope", "GumService", "Peer", "$location", "$routeParams", function($log, $scope, GumService, Peer, $location, $routeParams) {
		$scope.convo_id = $routeParams.convo_id;
	}])

	.controller("RootCtrl", ["$log", "$scope", "GumService", "chance", "Peer", "$location", function($log, $scope, GumService, chance, Peer, $location) {
		global.GumService = GumService;

		$scope.current_step = 1;

		$scope.convo_name = "";//chance.word({ length: 8 });
		$scope.valid_convo_name = true;

		$scope.$watch("convo_name", function(newVal, oldVal) {
			if($scope.convo_name == "")
				return;

			$scope.valid_convo_name = newVal.match(/^\w(\w|-){1,20}$/);
		})

		$scope.initGum = function() {
			GumService.init(function(stream) {
				$scope.current_step += 1;
			}, function(err) {
				$location.url("/error/" + err.type);
				$scope.$apply();
			});
		}

		$scope.launchRoom = function() {
			$log.debug("Launching...");

			function successCb(id) {
				$log.debug("Successfully connected to PeerServer... %s", id);

				$location.url(id);
				$scope.$apply();
			}

			if($scope.valid_convo_name){
				Peer.init($scope.convo_name, successCb);
			}else{
				if($scope.valid_convo_name == ""){
					Peer.init(chance.word({ length: 8 }), successCb);
				}
			}
		}
	}])

	.service("GumService", ["$log", "$rootScope", function($log, $rootScope) {
		var ms = null;
		navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

		function init(successCallback, failureCallback){
			var self = this;

			if(typeof navigator.getUserMedia == 'undefined'){
				return failureCallback(new ApplicationError("browser-incompatible"));
			}

			navigator.getUserMedia({ video: true, audio: true }, function(stream) {
				$rootScope.$apply(function() {
					ms = stream;

					var sc = successCallback || angular.noop;
					sc.call(self, ms);
				});
			}, function(err) {
				$rootScope.$apply(function() {
					var fc = failureCallback || angular.noop;
					fc.call(self, new ApplicationError("no-webcam"));
				});
			});
		}

		return {
			init: init,
			getMediaStream: function() {
				return ms;
			},
			reset: function() {
				if(!!ms){
					ms.stop();
				}
				ms = null;
			}
		}
	}])

	.service("chance", [function() {
		return new Chance();
	}])

	.service("Peer", ["$log", "$location", "$rootScope", function($log, $location, $rootScope) {
		var _peer = null;

		function init(name, callback) {
			_peer = new Peer(name, { 
				host:"chat.ysp.im",
				port: 9090,
				debug: 3,
				secure: true
			});

			_peer.on("error", function(err) {
				$location.url("/error/" + err.type);
				$rootScope.$apply();
			});

			_peer.on("open", callback);
		}

		return {
			init: init,
			reset: function() {
				if(!!_peer){
					_peer.destroy();
				}
			},
			peer: _peer
		}
	}])

})(this);