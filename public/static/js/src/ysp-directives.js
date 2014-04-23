(function(global){
	'use strict';
	
	angular.module("ysp-directives", ["btford.socket-io"])

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
					// video_window.
				});

			},
			template: "<video autoplay id='mirror' src></video>"
		}
	}])

})(this);