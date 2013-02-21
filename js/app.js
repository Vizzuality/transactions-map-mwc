

var MENU_TOGGLE_SIZE = 210;

var mapL,mapR,layerL,layerR;
var showing_menu = false;
var dynamic = true;

var staticMapsURLs = {
  staticDefault: 'http://saleiva2.cartodb.com/api/v1/viz/186/viz.json'
}

var dates = {
  SUN: ['19','26'],
  MON: ['20','27'],
  TUE: ['21','28'],
  WED: ['22','29'],
  THU: ['23','01'],
  FRI: ['24','02'],
  SAT: ['25','03']
}

$('.menuBar a.swtichButton').bind('click', function(){toggleMenu()});
$('#buttonContainer ul li a').bind('click', toggleMaps);
$('#daySelector').change(changeDate)

cartodb.createVis('map1', staticMapsURLs.staticDefault, {
      sql: "SELECT cartodb_id, customer_country, amount, (select the_geom_webmercator FROM comercios_08_mwc as c WHERE t.business_id =c.id ) as the_geom_webmercator FROM tx_output_08_mwc as t WHERE date_part('day',t.tx_date_proc) =" + dates['SUN'][0],
      cartodb_logo: false
}).done(function(vis, layers) {
  layerL = layers[1];
  mapL = vis.getNativeMap();
  mapL.on('moveend', function(e){changeMapState(mapL,mapR)});
  return;
});

cartodb.createVis('map2', staticMapsURLs.staticDefault, {
      sql: "SELECT cartodb_id, customer_country, amount, (select the_geom_webmercator FROM comercios_08_mwc as c WHERE t.business_id =c.id ) as the_geom_webmercator FROM tx_output_08_mwc as t WHERE date_part('day',t.tx_date_proc) =" + dates['SUN'][1],
      cartodb_logo: false,
      zoomControl: false
}).done(function(vis, layers) {
  layerR = layers[1];
  mapR = vis.getNativeMap();
  mapR.on('moveend', function(e){changeMapState(mapR,mapL)});
  return;
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
  var q = "SELECT cartodb_id, customer_country, amount, (select the_geom_webmercator FROM comercios_08_mwc as c WHERE t.business_id =c.id ) as the_geom_webmercator FROM tx_output_08_mwc as t WHERE date_part('day',t.tx_date_proc) =" + dates[_v][0];
  layerL.setQuery(q);
  q = "SELECT cartodb_id, customer_country, amount, (select the_geom_webmercator FROM comercios_08_mwc as c WHERE t.business_id =c.id ) as the_geom_webmercator FROM tx_output_08_mwc as t WHERE date_part('day',t.tx_date_proc) =" + dates[_v][1];
  layerR.setQuery(q);
}