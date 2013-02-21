
BALLS_COLOR = 'rgba(0, 255,255, 0.06)';
BALL_SIZE_GAIN = 1; // ball size is greater when this value is increased
BALL_ANIMATION_SPEED = 2; // no more than 5

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
    table : "mwc_torque",
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
    countby:'sum(i.amount)',
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
  $('#day').html(d.getDay());
  $('#hour').html(d.getHours() +":" + d.getMinutes());
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

