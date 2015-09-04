module.exports = function (grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    watch: {
      files: ['public/static/js/src/*.js', 'public/static/css/**/*.less'],
      tasks: ['uglify', 'less']
    },
    uglify: {
      build: {
        src: 'public/static/js/src/*.js',
        dest: 'public/static/js/build/ysp.js'
      }
    },
    less: {
      dev: {
        options: {
          paths: 'public/static/css/',
          compress: true,
          cleancss: true
        },
        files: {
          'public/static/css/main.css': 'public/static/css/main.less'
        }
      }
    }
  })

  grunt.loadNpmTasks('grunt-contrib-uglify')
  grunt.loadNpmTasks('grunt-contrib-watch')
  grunt.loadNpmTasks('grunt-contrib-less')

  grunt.registerTask('default', ['uglify'])
  grunt.registerTask('build-js', ['uglify'])
  grunt.registerTask('build-css', ['less'])
  grunt.registerTask('build-all', ['build-js', 'build-css'])
}
