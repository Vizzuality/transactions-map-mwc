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

function proxy(url, response, type) {

  response.setHeader('Cache-Control', 'public, max-age=31536000');
  response.setHeader('Content-Type', type || 'application/json');
  response.header("Access-Control-Allow-Origin", "*");
  response.header("Access-Control-Allow-Headers", "X-Requested-With, X-Prototype-Version, X-CSRF-Token");

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
}

app.get('/', function(req, response, next) {
  response.send('RAMBO siempre sera el mejor');
})

app.get('/tiles/anim/:z/:x/:y.torque.json', function(req, response, next) {

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
  if(!options.start_date.match(/^[0-9]+$/) || !options.end_date.match(/^[0-9]+$/)) {
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


  var url = SERVER + "api/v2/sql?api_key=" + api_key + "&q=" + encodeURIComponent(TILE_SQL);
  proxy(url, response);
});

app.get('/tiles/static/:z/:x/:y.png', function(req, response, next) {

  var day = req.query.day;
  if(!day.match(/^[0-9]+$/)) {
    response.send("haha, lovely");
    return;
  }
  var sql = "SELECT cartodb_id, customer_country, amount, (select the_geom_webmercator FROM comercios_08_mwc as c WHERE t.business_id =c.id ) as the_geom_webmercator FROM tx_output_08_mwc as t WHERE date_part('day',t.tx_date_proc) =" + day;
  var tile = "https://saleiva2.cartodb.com/tiles/tx_output_08_mwc/" + req.params.z +"/" + req.params.x + "/" + req.params.y + ".png"
  proxy(tile + "?sql=" + encodeURIComponent(sql) + "&cache_policy=persist&map_key=" + api_key, response, "image/png");

});

app.get('/chart', function(req, response, next) {

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

  if(!options.start_date.match(/^[0-9]+$/) || !options.end_date.match(/^[0-9]+$/)) {
    response.send("haha, lovely");
    return;
  }

  var sql = "select floor((date_part('epoch',{0}) - {1})/{2}) as date, sum(amount_es) as sum_es, sum(amount_world) as sum_w ".format(options.column, options.start_date, options.step)  + 
            "    FROM {0} i ".format(options.table) + 
            "    WHERE " +
            "        date_part('epoch',i.{0}) > {1} ".format(options.column, options.start_date) + 
            "        AND date_part('epoch',i.{0}) < {1} ".format(options.column, options.end_date) + 
            "    GROUP BY " +
            "        floor((date_part('epoch',{0}) - {1})/{2})".format(options.column, options.start_date, options.step) + 
            "    ORDER BY " +
            "        floor((date_part('epoch',{0}) - {1})/{2})".format(options.column, options.start_date, options.step) ;


  var url = SERVER + "api/v2/sql?api_key=" + api_key + "&q=" + encodeURIComponent(sql);
  proxy(url, response);
});


var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
