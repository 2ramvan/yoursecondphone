define(['src/BaseModule', 'src/BaseException', 'src/ChatModule', 'src/ViewModule', 'src/TelephonyModule', 'async', 'underscore', 'notice'],
	function(BaseModule, BaseException, ChatModule, ViewModule, TelephonyModule, async, _, notice) {
		var MainModule = BaseModule.subclass({
			module_id: 'MainModule',
			watchFor: [11204, 1007, 2000, 11101, 11102, 11103, 11105, 11106, 11107],
			timestamp_fmt: "{HH}:{mm}:{ss}",
			constructor: function() {
				base = this;
				this.init();

				if ($('#ad').height() === 0) {
					base.error(new BaseException(11204));
				}

				if (typeof $('#noaccount')[0] != "undefined") {
					document.getElementById('bootstrap').onclick = (base.bootstrap).bind(base);
				} else {
					base.bootstrap();
				}
			},
			bootstrap: function() {
				var mod_root = this;
				this.debug('Bootstrapping...');
				NProgress.start(); //Start NProgress loading bar.

				var startup_sequence = [
					function(callback) {
						NProgress.inc();

						base.viewModule = new ViewModule(callback);
						base.viewModule.on('input_activity', base.viewModule.input_activity);
						base.viewModule.on('session_link_hover', base.viewModule.session_link_hover);
					},
					function(callback) {
						async.series([
							function(callback) {
								var sid = window.location.pathname.replace(/[^a-z]/g, "");
								var resource, opts = {
										success: function(data) {
											mod_root.sid = data.sid;
											mod_root.session_id = data.session_id;
											mod_root.token = data.token;

											callback(null);
										},
										fail: function(data) {
											callback(new BaseException(data.code));
										},
										error: function(data) {
											callback(new BaseException(data.code, data.message));
										}
									};

								if (sid === "") {
									resource = "/session/create";
								} else {
									resource = "/session/{1}".assign(sid);
								}

								mod_root.ajax(resource, opts);
							}
						], function(err) {
							NProgress.inc();

							if (err instanceof BaseException) {
								callback(err);
							} else {
								base.viewModule.set('sid', base.sid);
								base.viewModule.set('session_link', "http://ysp.im/{1}".assign(base.sid));
								history.pushState(null, 'Your Second Phone', base.sid);
								callback(null);
							}
						});
					},
					function(callback) {
						NProgress.inc();

						base.telephonyModule = new TelephonyModule(callback);
					},
					function(callback) {
						NProgress.inc();

						base.chatModule = new ChatModule(callback);
					}
				];

				if (typeof $('#noaccount')[0] != "undefined") {
					startup_sequence.unshift(function(callback) {
						$('#videochat').addClass('fadeOutLeft');
						$('#noaccount').addClass('fadeOutRight');
						$('#bootstrap').fadeOut(1000);

						setTimeout(function() {
							$('#videochat').remove();
							$('#noaccount').remove();
							$('#bootstrap').remove();
							$('#main_hold').html('');
							callback(null);
						}, 1000);
					});
				}

				async.series(startup_sequence, function(err) {
					log.debug('Bootstrapping sequence has completed...');

					if (err instanceof BaseException) {
						mod_root.error(err);
					}

					NProgress.done();
				});
			},
			handleError: function(exception){
				//Notice:
				//Let Fatal Errors "fall through"
				//i.e. Don't Catch them

				switch(exception.code){
					case 11204:
						new notice("<i class=\"icon-frown icon-3x pull-left\"></i>{1}".assign(exception.message), {
							type: 'error',
							onclick: function() {
								return false;
							},
							timeout: false
						});
						break;
					default:
						base.viewModule.set('fatalError', true).set('fatal_error_message', exception.message);
						break;
				}
			}
		});

		return MainModule;
	});