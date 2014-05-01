(function(global){
	'use strict';
	
	angular.module("ysp-directives", [])

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
			template: "<video autoplay class='peer_window'></video><div class='peer_color' ng-class='peer.color_code'></div>"
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
					$(element).removeClass("inactive");
				});

				GumService.on("inactive", function() {
					$(element).addClass("inactive");
				});

			},
			template: "<video autoplay id='mirror' muted='muted'></video><div class='cf'></div>"
		}
	}])

})(this);