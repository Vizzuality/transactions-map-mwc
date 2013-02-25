
BALLS_COLOR_ES = 'rgba(0, 255,255, 0.06)';
BALLS_COLOR_NO_ES = 'rgba(255, 0 ,255, 0.06)';
BALL_SIZE_GAIN = 0.92; // ball size is greater when this value is increased
BALL_ANIMATION_SPEED = 2; // no more than 5
JATORRE_CND_URL = 'http://cartobbva.vizzuality.netdna-cdn.com/';
START_OFFSET_HOURS = 10;
//JATORRE_CND_URL = 'http://development.localhost.lan:5000/';


var daysAbv = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
var lastSelectedDay = 'SUN';
var MENU_TOGGLE_SIZE = 210;
var staticMapsURLs = {
  staticDefault: 'js/viz.json',
  staticHere: 'js/viz_here.json'
}

var opts = {
  lines: 15, // The number of lines to draw
  length: 12, // The length of each line
  width: 8, // The line thickness
  radius: 50, // The radius of the inner circle
  corners: 1, // Corner roundness (0..1)
  rotate: 0, // The rotation offset
  color: '#fff', // #rgb or #rrggbb
  speed: 1, // Rounds per second
  trail: 60, // Afterglow percentage
  shadow: false, // Whether to render a shadow
  hwaccel: false, // Whether to use hardware acceleration
  className: 'spinner', // The CSS class to assign to the spinner
  zIndex: 2e9, // The z-index (defaults to 2000000000)
  top: 'auto', // Top position relative to parent in px
  left: 'auto' // Left position relative to parent in px
};
var spinner = new Spinner(opts).spin();
var special_browsers = $.browser.mobile;
document.getElementById('bigImg').appendChild(spinner.el);

/** 
 * map class
 */

// IE checker...
if ($.browser.msie) {
  window.location = "ie.html"
}

function Map(options) {
  this.map = null;
  this.staticLayer = null;
  this.options = options;
}

Map.prototype.init = function(done) {
  var self = this;
  this.dynamic = true;

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
  
  //base layer selector
  var baseViz = staticMapsURLs.staticDefault;
  if (isHere) {
    baseViz = staticMapsURLs.staticHere;
  }
  
  cartodb.createVis(this.options.el, baseViz, {
        cartodb_logo: false,
        zoom: 13,
        no_cdn: true
  }).done(function(vis, layers) {
    self.map = vis.getNativeMap();
    /*self.map.setOptions({
      maxZoom: 13
    });*/

    self.zoom = vis.getOverlay('zoom');
    self.staticLayer = layers[1];
    self.dinamycLayer = new L.TimeLayer(options);

    // Mobile/tablets devices
    if (special_browsers) {
      setStatic();
    } else {
      self.map.removeLayer(self.staticLayer);
      self.map.addLayer(self.dinamycLayer);
      L.circle([41.37260496341315, 2.1510283648967743], 700, {color:'#fff',weight:'2',dashArray:'6,8',fillOpacity:'0'}).addTo(self.map);
      $('.leaflet-control-attribution').fadeOut();
      var d = self.dinamycLayer.getTime();
      self.dinamycLayer.setTime(new Date(d.getTime() + START_OFFSET_HOURS*60*60*1000));
    }

    done && done();
  });

}

Map.prototype.set_dynamic = function(b) {
  if(!b) {
    this.map.removeLayer(this.dinamycLayer);
    this.map.addLayer(this.staticLayer);
  } else {
    this.map.removeLayer(this.staticLayer);
    this.map.addLayer(this.dinamycLayer);
  }
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
  //this.staticLayer.setQuery(this._queryForDay(day));
  this.staticLayer.options.extra_params.day = this.options.dates[day];
  this.staticLayer.__update();//setQuery(null); //hack to reload tiles without changing the timestamp
  this.staticLayer.redraw();
}

var mapL,mapR;
var showing_menu = false;
var dynamic = true;

$('.menuBar a.swtichButton').bind('click', function(){toggleMenu()});
$('#buttonContainer ul li a').bind('click', toggleMaps);
$('.aboutTab a').bind('click', toggleCover);
$('#daySelector').change(changeDate)

var chartL, chartR;

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
  end: new Date(2012, 1, 26)
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
  end: new Date(2012, 2, 4)
});


function AnimationController(maps, charts) {
  this.maps = maps;
  this.charts = charts;
  this.render = this.render.bind(this);
  this.playing = false;
  this.dynamic = true;
}

AnimationController.prototype.play = function() {
  this.previous_time = new Date().getTime();
  this.playing = true;
  requestAnimationFrame(this.render);
}

AnimationController.prototype.stop = function() {
  this.playing = false;
}

AnimationController.prototype.toggle = function() {
  if(this.playing) this.stop();
  else this.play();
}

AnimationController.prototype.set_dynamic = function(b) {
  if(!b) {
    this.stop();
  } 
  this.dynamic = b;
  this.maps.forEach(function(m) {
    m.set_dynamic(b);
  });
  this.charts.forEach(function(m) {
    m.set_dynamic(b);
  });
  if(b) {
    // render a tick to update view
    // hack, of couse
    this.render();
  }

}


AnimationController.prototype.render = function() {
  var now = new Date().getTime();
  var delta =  0.001*(now - this.previous_time);
  this.previous_time = now;
  this.maps.forEach(function(m) {
    m.dinamycLayer._render(Math.min(0.2, delta));
  });
  if(this.playing) requestAnimationFrame(this.render);
  var t = this.maps[1].dinamycLayer.getTime().getTime();
  // restart the animation
  if(new Date(2012, 2, 4).getTime() < t) {
    this.maps[0].dinamycLayer.resetTime();
    this.maps[1].dinamycLayer.resetTime();
  }
  this.update_ui();
}

AnimationController.prototype.update_ui= function() {
  var d = this.maps[0].dinamycLayer.getTime();
  var d1 = this.maps[1].dinamycLayer.getTime();
  $('#day').html(daysAbv[d.getDay()]);
  $('#hour .hours').html(d.getHours().pad(2));
  $('#hour .minutes').html(d.getMinutes().pad(2));
  this.charts[0].set_time(d);
  this.charts[1].set_time(d1);
}


//Returns a number with leading 0's. This is cool for dates.
Number.prototype.pad = function (len) {
  return (new Array(len+1).join("0") + this).slice(-len);
}

var animation;
mapL.init(function() {
  mapR.init(function() {

    var c = 2;
    var loaded = function() {
      if(!--c) {
        $('#cover').bind('click', toggleCover);
        spinner.stop();
        $('.playBtn').fadeIn();
      }
    }

    if (special_browsers) {
      // ...
      c = 1;
      loaded();
    } else {
      mapL.dinamycLayer.on('tilesLoaded', loaded);
      mapR.dinamycLayer.on('tilesLoaded', loaded);
    }

    // link map movement
    mapL.map.on('moveend', function(e) {
        changeMapState(mapL.map, mapR.map)
    }).on('click', function() {
      if(animation.dynamic) {
        animation.toggle();
      }
    });

    mapR.map.on('moveend', function(e) {
        changeMapState(mapR.map, mapL.map)
    }).on('click', function() {
      if(animation.dynamic) {
        animation.toggle();
      }
    });

    mapR.zoom.clean();
    chart_data({
      weeks: [
        [new Date(2012, 1, 19), new Date(2012, 1, 26)],
        [new Date(2012, 1, 26), new Date(2012, 2, 4)]
      ],
      table: 'torque_mwc_2',
      column: 'date'
    }, function(data) {

      chartL = new Chart({
        el: '#chart1',
        start_date: new Date(2012, 1, 19).getTime()/1000,
        base_date: new Date(2012, 1, 19).getTime()/1000,
        foreground: data[0],
        background: data[1]

      });

      chartR = new Chart({
        el: '#chart2',
        start_date: new Date(2012, 1, 26).getTime()/1000,
        base_date: new Date(2012, 1, 19).getTime()/1000,
        foreground: data[1],
        background: data[0]
      });

      animation = new AnimationController([mapL, mapR], [chartL, chartR]);
      //animation.play();

    })

  })
});


function chart_data(options, callback) {
  var self = this;
  this.options = options;
  this.options.start_date = options.weeks[0][0].getTime()/1000
  this.options.end_date = options.weeks[1][1].getTime()/1000
  this.options.column = options.column || 'date';
  this.options.step = options.steo || 15*60;

  /*
  var sql = "select floor((date_part('epoch',{0}) - {1})/{2}) as date, sum(amount_es) as sum_es, sum(amount_world) as sum_w ".format(self.options.column, self.options.start_date, self.options.step)  + 
            "    FROM {0} i ".format(self.options.table) + 
            "    WHERE " +
            "        date_part('epoch',i.{0}) > {1} ".format(self.options.column, self.options.start_date) + 
            "        AND date_part('epoch',i.{0}) < {1} ".format(self.options.column, self.options.end_date) + 
            "    GROUP BY " +
            "        floor((date_part('epoch',{0}) - {1})/{2})".format(self.options.column, self.options.start_date, self.options.step) + 
            "    ORDER BY " +
            "        floor((date_part('epoch',{0}) - {1})/{2})".format(self.options.column, self.options.start_date, self.options.step) ;
            */

  //d3.json("http://a.netdna.cartocdn.com/saleiva2/api/v2/sql?q=" + encodeURIComponent(sql), function(data) {
  d3.json(JATORRE_CND_URL + 'chart?start_date=' + this.options.start_date + "&end_date=" + this.options.end_date, function(data) {
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
    var max = d3.max(data, function(d) { return d3.max([d.sum_w + d.sum_es]); });
    first_week.max = max;
    second_week.max = max;
    callback([first_week, second_week]);
  });
}

function Chart(options) {
  self = this;
  this.options = options;

  var chart = timeSeriesChart()
    .x(function(d) { return new Date(1000*(options.base_date + d.date*15*60)); })
    .y(function(d) { return [+d.sum_es, d.sum_w]; });

  this.chart = chart;

  this.container_width = $(options.el).parent().width()
  var width = this.container_width*7; //days

  d3.select(options.el)
    .datum(options.background) 
    .call(chart.only_stroke(true).stroke_opacity(0.3).width(width))

  d3.select(options.el)
    .datum(options.foreground) 
    .call(chart.only_stroke(false).stroke_opacity(1).width(width))


  
  var canvas = d3.select(options.el).append('canvas');
  canvas.attr("width", chart.width())
        .attr("height", chart.height());

  var timeMap = {};
  for(var i = 0; i < options.foreground.length; ++i) {
    var d = options.foreground[i];
    timeMap[d.date] = [d.sum_es, d.sum_w];
  }
  this.timeMap = timeMap;
  this.animCanvas = canvas[0][0];
  this.current_pos = 0;
  this.dynamic = true;

}

Chart.prototype.qty_for_time = function(d) {
  var t = ((d.getTime()/1000) - this.options.start_date)/(15*60);
  return this.timeMap[t]
}

Chart.prototype.update_marker_pos = function(d) {
  var chart = this.chart;
  var c = this.animCanvas;
  var tbase = ((d.getTime()/1000) - this.options.base_date)/(15*60);
  c.width = c.width;

  var v0 = this.timeMap[tbase>> 0]
  var v1 = this.timeMap[(tbase + 1) >> 0]

  var interpol = tbase - (tbase>>0);

  if(v0 && v1) {
    var size = 3;
    var s2 = size;
    t = chart.xScale()(d);
    var ctx = c.getContext('2d');

    var x1 = chart.width();
    var y0 = chart.height();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.rect(t, 0, 1, y0);
    ctx.closePath();
    ctx.fill();

    y0 = chart.yScale()(v0[0]);
    y1 = chart.yScale()(v1[0]);
    y0 += interpol*(y1 - y0);

    ctx.fillStyle = 'rgba(49, 191, 255, 1)';
    ctx.beginPath();
    ctx.arc(t, y0, size, 0, Math.PI*2, true, true);
    ctx.closePath();
    ctx.fill();

    y0 = chart.yScale()(v0[0] + v0[1]);
    y1 = chart.yScale()(v1[0] + v1[1]);
    y0 += interpol*(y1 - y0);

    ctx.fillStyle = 'rgba(255, 0, 255, 1)';
    ctx.beginPath();
    ctx.arc(t, y0, size, 0, Math.PI*2, true, true);
    ctx.closePath();
    ctx.fill();
  }
}

Chart.prototype.set_dynamic = function(d) {
  this.dynamic = d;
  if(!d) {
    $(this.animCanvas).fadeOut()
  } else {
    $(this.animCanvas).fadeIn()
  }
}

Chart.prototype.changeDate = function(day) {
  var dates = {
    SUN: 0,
    MON: 1,
    TUE: 2,
    WED: 3,
    THU: 4,
    FRI: 5,
    SAT: 6
  };
  var days = dates[day];
  var d = this.options.start_date + days*24*60*60;
  this.set_time(new Date(d*1000));
}

Chart.prototype.set_time = function(d) {

  var chart = this.chart;

  var t = ((d.getTime()/1000) - this.options.start_date)/(15*60);
  t = t >> 0

  var left =  -this.container_width*((t/(4*24))>>0);
  if(this.current_pos != left) {
    $(this.options.el).find('canvas').animate({
      left: left
    }, 1000);
    this.current_pos = left;
  }
  if(this.dynamic) {
    this.update_marker_pos(d);
  }


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
  animation.set_dynamic(dynamic);

  if(!dynamic) {
    //HACK
    changeDate({ target: { value: lastSelectedDay }});
  }
}

//Change the date shown in the static maps
function changeDate(e){
  var _v = e.target.value;
  lastSelectedDay = _v;
  mapL.changeDate(_v);
  mapR.changeDate(_v);
  chartL.changeDate(_v);
  chartR.changeDate(_v);
}

//Shows/hide cover component
function toggleCover(e){
  if($('#cover').is(':visible')){
    $('#cover').fadeOut();
  }else{
    $('#cover').fadeIn();
  }
  animation.toggle();
}

function setStatic() {
  // Overwrite Animation controller play
  AnimationController.prototype.play = function() {}
  // Show day select
  $('#clock').hide();
  $('#daySelector').show();
  // Remove menu
  $('.menuBar.expandAnimate').remove();
  // Add new styles
  $('body').addClass('special')
}




