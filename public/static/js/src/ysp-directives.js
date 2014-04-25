(function(global){
	'use strict';
	
	angular.module("ysp-directives", ["btford.socket-io"])

	.directive("peer", ["$log", function($log) {
		
		return {
			restrict: "E",
			scope: {
				peer: "=info"
			},
			link: function(scope, element, attrs) {
				var video_window = element.children()[0];

				if(!!scope.peer.ms){
					attachMediaStream(video_window, scope.peer.ms);
				}else{
					scope.peer.once("stream", function() {
						attachMediaStream(video_window, scope.peer.ms);
					});
				}

			},
			template: "<video autoplay class='peer_window' src></video>"
		}

	}])

	.directive("mirror", ["$log", "GumService", function($log, GumService) {
		
		global.GumService = GumService;

		return {
			restrict: "E",
			link: function(scope, element, attrs) {
				var video_window = element.children()[0];

				if(GumService.isInvoked()){
					attachMediaStream(video_window, GumService.getMediaStream());
				}

				GumService.on("active", function(stream) {
					attachMediaStream(video_window, stream);
				});

				GumService.on("inactive", function() {
					video_window.src
				});

			},
			template: "<video autoplay id='mirror' src></video><div class='cf'></div>"
		}
	}])

})(this);