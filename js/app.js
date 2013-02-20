

var MENU_TOGGLE_SIZE = 210;

var mapL,mapR;
var showing_menu = false;
var staticMapsURLs = {
  staticDefault: 'http://saleiva2.cartodb.com/api/v1/viz/186/viz.json'
}

cartodb.createVis('map1', staticMapsURLs.staticDefault, {
      sql: "SELECT cartodb_id, customer_country, amount, (select the_geom_webmercator FROM comercios_08_mwc as c WHERE t.business_id =c.id ) as the_geom_webmercator FROM tx_output_08_mwc as t WHERE t.tx_date_proc > '2012-02-18T14:00:00+01:00' AND t.tx_date_proc < '2012-02-18T16:30:00+01:00'",
      cartodb_logo: false
}).done(function(vis, layers) {
  mapL = vis.getNativeMap();
  mapL.on('moveend', function(e){changeMapState(mapL,mapR)});
  return;
});

cartodb.createVis('map2', staticMapsURLs.staticDefault, {
      sql: "SELECT cartodb_id, customer_country, amount, (select the_geom_webmercator FROM comercios_08_mwc as c WHERE t.business_id =c.id ) as the_geom_webmercator FROM tx_output_08_mwc as t WHERE t.tx_date_proc > '2012-02-19T14:00:00+01:00' AND t.tx_date_proc < '2012-02-19T16:30:00+01:00'",
      cartodb_logo: false,
      zoomControl: false
}).done(function(vis, layers) {
  mapR = vis.getNativeMap();
  mapR.on('moveend', function(e){changeMapState(mapR,mapL)});
  return;
});

$('.menuBar a').bind('click', function(){toggleMenu()});

//Applies the same view from src to tgt map
function changeMapState(src,tgt){
  tgt.setView(src.getCenter(), src.getZoom());
}

//Toggle menubar.
function toggleMenu(){
  var _tgt = (showing_menu) ? '-' : '+';
  var _td = (showing_menu) ? 250 : 0;
  showing_menu = !showing_menu;
  $('.moveUpAnimate').animate({
    bottom: _tgt+'='+MENU_TOGGLE_SIZE},
    350);
  $('.expandAnimate').animate({
    height: _tgt+'='+MENU_TOGGLE_SIZE},
    350);
  $('.swtichButton').delay(_td).fadeToggle(150);
  $('#buttonContainer').delay(_td).fadeToggle(600);
}