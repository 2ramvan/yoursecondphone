var _ = require("lodash");

var basic = {};

basic.render = function(view_name, status_code) {
  if (!status_code)
    status_code = 200;

  return function(req, res) {
    res.status(status_code);
    res.render(view_name, {
      page_id: view_name
    });
  }
};

basic.index = function(req, res) {
  res.locals.page_id = "main";
  res.locals.skipIntro = false;
  res.locals.show_ad = true;

  res.render("index", {
    page_id: "main"
  });
}

basic.server_error = function(err, req, res, next) {
  console.error("ERROR: %s - %s", new Date(), err.hasOwnProperty("stack") ? err.stack : err);

  res.status(500);
  res.render("server_error", {
    page_id: "server_error"
  });
};

module.exports = basic;