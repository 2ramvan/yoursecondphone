log.setLevel(log.levels.ERROR);
//log.enableAll();

require.config({
	baseUrl: '/static/js/',
	paths: {
		text: ['//cdnjs.cloudflare.com/ajax/libs/require-text/2.0.5/text.min', 'plugin/text'],
		rv: ['plugin/rv'],
		async: ['//cdnjs.cloudflare.com/ajax/libs/async/0.2.7/async.min', 'lib/async.min'],
		stapes: ['//cdnjs.cloudflare.com/ajax/libs/stapes/0.8.0/stapes.min', 'lib/stapes.min'],
		underscore: ['//cdnjs.cloudflare.com/ajax/libs/underscore.js/1.4.4/underscore-min', 'lib/underscore-min'],
		Ractive: ['//cdnjs.cloudflare.com/ajax/libs/ractive.js/0.3.6/ractive.min', 'lib/ractive.min'],
		opentok: ['lib/TB.min'],
		notice: ['lib/notice.min'],
		socket: ['//cdnjs.cloudflare.com/ajax/libs/socket.io/0.9.16/socket.io.min', 'lib/socket.io.min']
	},
	shim: {
		'stapes': {
			exports: 'Stapes'
		},
		'underscore': {
			exports: '_'
		},
		'opentok': {
			exports: 'TB'
		}
	}
});

require(['src/MainModule', 'lang'], function(MainModule, lang) {
	window.ysp_lang = lang;
	window.ysp_errors = {
		11101: ysp_lang.errors.session_not_found,
		11102: ysp_lang.errors.global_ajax_error,
		11103: ysp_lang.errors.outdated_browser,
		11204: ysp_lang.errors.dont_block_ads,
		11105: ysp_lang.errors.session_retrieval_error,
		11106: ysp_lang.errors.unknown_error,
		11107: ysp_lang.errors.non_jsend_compliance,
		13201: ysp_lang.errors.general_socket_error,
		13202: ysp_lang.errors.chat_connection_failed,
		1000: ysp_lang.errors.tb_load_failed,
		1004: ysp_lang.errors.tb_auth_error,
		1005: ysp_lang.errors.tb_invalid_session_id,
		1006: ysp_lang.errors.tb_connect_failed,
		1007: ysp_lang.errors.tb_connect_rejected,
		1008: ysp_lang.errors.tb_connect_timeout,
		1009: ysp_lang.errors.tb_security_error,
		1010: ysp_lang.errors.tb_not_connected,
		1011: ysp_lang.errors.tb_invalid_param,
		1013: ysp_lang.errors.tb_connection_failed,
		1014: ysp_lang.errors.tb_api_response_fail,
		1500: ysp_lang.errors.tb_unable_to_publish,
		1510: ysp_lang.errors.tb_unable_to_signal,
		1520: ysp_lang.errors.tb_unable_to_force_disconnect,
		1530: ysp_lang.errors.tb_unable_to_force_unpublish,
		1535: ysp_lang.errors.tb_force_unpublish_on_invalid_stream,
		2000: ysp_lang.errors.tb_internal_error,
		2010: ysp_lang.errors.tb_report_issue_failure
	};

	window.controller = new MainModule();
});