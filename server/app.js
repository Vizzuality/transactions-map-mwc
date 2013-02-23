var express = require('express');
var https = require('https');

SERVER = 'https://saleiva2.cartodb.com/'

var app = express.createServer(express.logger());
var api_key = process.env.API_KEY;

if(api_key === undefined) {
  api_key = require('./secret').API_KEY;
}

String.prototype.format = (function (i, safe, arg) {
    function format() {
        var str = this,
            len = arguments.length + 1;

        for (i = 0; i < len; arg = arguments[i++]) {
            safe = typeof arg === 'object' ? JSON.stringify(arg) : arg;
            str = str.replace(RegExp('\\{' + (i - 1) + '\\}', 'g'), safe);
        }
        return str;
    }

    //format.native = String.prototype.format;
    return format;
})();


app.get('/', function(req, response, next) {
})

app.get('/tiles/:z/:x/:y.torque.json', function(req, response, next) {

  var coord = {
    x: req.params.x,
    y: req.params.y
  }
  var zoom = req.params.z

 var options = {
    user : "saleiva2",
    table : "torque_mwc_2",
    column : "date",
    blendmode : 'source-over',
    trails : false,
    point_type : 'square',
    cumulative : true,
    resolution : 2,
    steps : 750,
    step: 15*60,
    fps : 30,
    fitbounds : 1,
    clock : true,
    countby:'sum(i.amount_es)',
    start_date: req.query.start_date,
    end_date: req.query.end_date
  }

  // sanity check
  try {
    parseInt(options.start_date, 10)
    parseInt(options.end_date, 10)
  } catch(e) {
    response.send("haha, lovely");
    return;
  }

  TILE_SQL = "WITH hgrid AS ( " +
      "    SELECT CDB_RectangleGrid( " +
      "       CDB_XYZ_Extent({0}, {1}, {2}), ".format(coord.x, coord.y, zoom) +
      "       CDB_XYZ_Resolution({0}) * {1}, ".format(zoom, options.resolution) +
      "       CDB_XYZ_Resolution({0}) * {1} ".format(zoom, options.resolution) +
      "    ) as cell " +
      " ) " +
      " SELECT  " +
      "    x, y, array_agg(c) vals, array_agg(f) vals_non_es ,array_agg(d) dates " +
      " FROM ( " +
      "    SELECT " +
      "      round(CAST (st_xmax(hgrid.cell) AS numeric),4) x, round(CAST (st_ymax(hgrid.cell) AS numeric),4) y, " +
      "      {0} c, sum(i.amount_world) f, floor((date_part('epoch',{1})- {2})/{3}) d ".format(options.countby, options.column, options.start_date, options.step) +
      "    FROM " +
      "        hgrid, {0} i ".format(options.table) +
      "    WHERE " +
      "        date_part('epoch',i.{0}) > {1} ".format(options.column, options.start_date) + 
      "        AND date_part('epoch',i.{0}) < {1} ".format(options.column, options.end_date) + 
      "        AND ST_Intersects(i.the_geom_webmercator, hgrid.cell) " +
      "    GROUP BY " +
      "        hgrid.cell, floor((date_part('epoch',{0}) - {1})/{2})".format(options.column, options.start_date, options.step) + 
      " ) f GROUP BY x, y";


  response.setHeader('Cache-Control', 'public, max-age=31536000');
  response.setHeader('Content-Type', 'application/json');
  response.header("Access-Control-Allow-Origin", "*");
  response.header("Access-Control-Allow-Headers", "X-Requested-With, X-Prototype-Version, X-CSRF-Token");

  var url = SERVER + "api/v2/sql?api_key=" + api_key + "&q=" + encodeURIComponent(TILE_SQL);
  https.get(url, function(res) {
    res.on('data', function (chunk) {
      response.write(chunk);
    });
    res.on('end', function() {
      response.end();
    });
    res.on('error', function() {
      response.end();
    });
  }).on('error',function(e) {
    console.log(e);
  });
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
