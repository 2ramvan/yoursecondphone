module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON("package.json"),
		watch: {
			files: ["public/static/js/src/*.js"],
			tasks: ["uglify"]
		},
		uglify: {
			build: {
				src: "public/static/js/src/*.js",
				dest: "public/static/js/build/ysp.js"
			}
		}
	});

	grunt.loadNpmTasks("grunt-contrib-uglify");
	grunt.loadNpmTasks('grunt-contrib-watch');

	grunt.registerTask("default", ["uglify"]);
}
