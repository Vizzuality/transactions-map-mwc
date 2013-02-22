
BALLS_COLOR_ES = 'rgba(0, 255,255, 0.06)';
BALLS_COLOR_NO_ES = 'rgba(255, 0 ,255, 0.06)';
BALL_SIZE_GAIN = 0.92; // ball size is greater when this value is increased
BALL_ANIMATION_SPEED = 2; // no more than 5

var daysAbv = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
var MENU_TOGGLE_SIZE = 210;
var staticMapsURLs = {
  staticDefault: 'http://saleiva2.cartodb.com/api/v1/viz/186/viz.json'
}


/** 
 * map class
 */

function Map(options) {
  this.map = null;
  this.staticLayer = null;
  this.options = options;
}

Map.prototype.init = function(done) {
  var self = this;

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
    start_date: (this.options.start.getTime()/1000)>>0,
    end_date: (this.options.end.getTime()/1000)>>0
  }

  cartodb.createVis(this.options.el, staticMapsURLs.staticDefault, {
        sql: this._queryForDay(this.options.day),
        cartodb_logo: false
  }).done(function(vis, layers) {
    self.map = vis.getNativeMap();
    self.zoom = vis.getOverlay('zoom');
    self.staticLayer = layers[1];
    self.dinamycLayer = new L.TimeLayer(options);

    self.map.removeLayer(self.staticLayer);
    self.map.addLayer(self.dinamycLayer);
    done && done();
  });

}

Map.prototype.play = function() {
  this.dinamycLayer.play();
}

Map.prototype.stop = function() {
}

Map.prototype._queryForDay = function(d) {
  return "SELECT cartodb_id, customer_country, amount, (select the_geom_webmercator FROM comercios_08_mwc as c WHERE t.business_id =c.id ) as the_geom_webmercator FROM tx_output_08_mwc as t WHERE date_part('day',t.tx_date_proc) =" + this.options.dates[d];
}

Map.prototype.changeDate = function(day){
  this.staticLayer.setQuery(this._queryForDay(day));
}

var mapL,mapR;
var showing_menu = false;
var dynamic = true;



$('.menuBar a.swtichButton').bind('click', function(){toggleMenu()});
$('#buttonContainer ul li a').bind('click', toggleMaps);
$('#daySelector').change(changeDate)


mapL = new Map({
  el: 'map1',
  day: 'SUN',
  dates: {
    SUN: '19',
    MON: '20',
    TUE: '21',
    WED: '22',
    THU: '23',
    FRI: '24',
    SAT: '25'
  },
  start: new Date(2012, 1, 19),
  end: new Date(2012, 1, 25)
});

chart_data({
  weeks: [
    [new Date(2012, 1, 19), new Date(2012, 1, 25)],
    [new Date(2012, 1, 26), new Date(2012, 2, 3)]
  ],
  table: 'torque_mwc_2',
  column: 'date'
}, function(data) {

  chart = new Chart({
    el: '#chart1',
    start_date: new Date(2012, 1, 19).getTime()/1000,
    foreground: data[0],
    background: data[1],

  });

  chart = new Chart({
    el: '#chart2',
    start_date: new Date(2012, 1, 19).getTime()/1000,
    foreground: data[1],
    background: data[0],
  });

})

mapR = new Map({
  el: 'map2',
  day: 'SUN',
  dates: {
    SUN: '26',
    MON: '27',
    TUE: '28',
    WED: '29',
    THU: '01',
    FRI: '02',
    SAT: '03'
  },
  start: new Date(2012, 1, 26),
  end: new Date(2012, 2, 3)
});


function AnimationController(maps) {
  this.maps = maps;
  this.render = this.render.bind(this);
}

AnimationController.prototype.play = function() {
  this.previous_time = new Date().getTime();
  requestAnimationFrame(this.render);
}

AnimationController.prototype.render = function() {
  var now = new Date().getTime();
  var delta =  0.001*(now - this.previous_time);
  this.previous_time = now;
  this.maps.forEach(function(m) {
    m.dinamycLayer._render(Math.min(0.2, delta));
  });
  requestAnimationFrame(this.render);
  this.update_ui();
}

AnimationController.prototype.update_ui= function() {
  var d = this.maps[0].dinamycLayer.getTime();
  $('#day').html(daysAbv[d.getDay()]);
  $('#hour').html(d.getHours().pad(2) +":" +d.getMinutes().pad(2)+'h');
}

//Returns a number with leading 0's. This is cool for dates.
Number.prototype.pad = function (len) {
  return (new Array(len+1).join("0") + this).slice(-len);
}

var animation;
mapL.init(function() {
  mapR.init(function() {
    // link map movement
    mapL.map.on('moveend', function(e) {
        changeMapState(mapL.map, mapR.map)
    });
    mapR.map.on('moveend', function(e) {
        changeMapState(mapR.map, mapL.map)
    });
    mapR.zoom.clean();
    animation = new AnimationController([mapL, mapR]);
    animation.play();
  })
});


function chart_data(options, callback) {
  var self = this;
  this.options = options;
  this.options.start_date = options.weeks[0][0].getTime()/1000
  this.options.end_date = options.weeks[1][1].getTime()/1000
  this.options.column = options.column || 'date';
  this.options.step = options.steo || 15*60;

  var sql = "select floor((date_part('epoch',{0}) - {1})/{2}) as date, sum(amount_es) as sum_es,sum(amount_world) as sum_w ".format(self.options.column, self.options.start_date, self.options.step)  + 
            "    FROM {0} i ".format(self.options.table) + 
            "    WHERE " +
            "        date_part('epoch',i.{0}) > {1} ".format(self.options.column, self.options.start_date) + 
            "        AND date_part('epoch',i.{0}) < {1} ".format(self.options.column, self.options.end_date) + 
            "    GROUP BY " +
            "        floor((date_part('epoch',{0}) - {1})/{2})".format(self.options.column, self.options.start_date, self.options.step) + 
            "    ORDER BY " +
            "        floor((date_part('epoch',{0}) - {1})/{2})".format(self.options.column, self.options.start_date, self.options.step) ;

  d3.json("http://saleiva2.cartodb.com/api/v2/sql?q=" + encodeURIComponent(sql), function(data) {
    data = data.rows;

    var s = options.weeks[0][0].getTime()/1000
    var e = options.weeks[0][1].getTime()/1000
    var si = s;
    var first_week = data.filter(function(r) {
      var d = r.date*15*60 + si;
      return d > s && d < e;
    });
    s = options.weeks[1][0].getTime()/1000
    e = options.weeks[1][1].getTime()/1000
    var second_week = data.filter(function(r) {
      var d = r.date*15*60 + si;
      return d > s && d < e;
    });
    var max = d3.max(data, function(d) { return d3.max([d.sum_w, d.sum_es]); });
    first_week.max = max;
    second_week.max = max;
    callback([first_week, second_week]);
  });
}

function Chart(options) {
  self = this;
  this.options = options;

  var chart = timeSeriesChart()
    .x(function(d) { return new Date(1000*(options.start_date + d.date*15*60)); })
    .y(function(d) { return [+d.sum_es, d.sum_w]; });

  
  d3.select(options.el)
    .datum(options.background) 
    .call(chart)

  d3.select(options.el)
    .datum(options.foreground) 
    .call(chart)

}

//Applies the same view from src to tgt map
function changeMapState(src,tgt){
  tgt.setView(src.getCenter(), src.getZoom());
}

//Toggle menubar visibility
function toggleMenu(){
  var _tgt = (showing_menu) ? '-' : '+';
  var _td = (showing_menu) ? 200 : 0;
  showing_menu = !showing_menu;
  $('.moveUpAnimate').animate({
    bottom: _tgt+'='+MENU_TOGGLE_SIZE},
  350);
  $('.expandAnimate').animate({
    height: _tgt+'='+MENU_TOGGLE_SIZE},
  350);
  $('.swtichButton').delay(_td).fadeToggle(150);
  $('#buttonContainer').delay(_td).fadeToggle(100);
}

//Toggle map type and mark selected item
function toggleMaps(e){
  var $a = $(e.target).closest('a')
  dynamic = !dynamic;
  if($a.hasClass('selected')){
    toggleMenu();
    return;
  }
  $('#buttonContainer ul li a').removeClass('selected');
  $a.addClass('selected');
  var $el = (dynamic) ? $('#clock') : $('#daySelector')
  $('#dateControl').contents().hide();
  $el.show();
  toggleMenu();
}

//Change the date shown in the static maps
function changeDate(e){
  var _v = e.target.value;
  mapL.changeDate(_v);
  mapR.changeDate(_v);
}

