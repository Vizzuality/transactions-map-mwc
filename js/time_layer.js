
var originShift = 2 * Math.PI * 6378137 / 2.0;
var initialResolution = 2 * Math.PI * 6378137 / 256.0;
function meterToPixels(mx, my, zoom) {
    var res = initialResolution / (1 << zoom);
    var px = (mx + originShift) / res;
    var py = (my + originShift) / res;
    return [px, py];
}

L.TimeLayer = L.CanvasLayer.extend({

  options: {
    user:'viz2',
    table:'ny_bus',
    column:'timestamp',
    steps:250,
    resolution:3,
    cumulative:false,
    fps:24,
    autoplay:true,
    clock:false,
    zindex:0,
    fitbounds:false,
    countby:'count(i.cartodb_id)',
    blendmode:'source-over',
    trails:false,
    point_type:'square',
    subtitles:false
  },

  initialize: function(options) {
    L.CanvasLayer.prototype.initialize.call(this);
    L.setOptions(this, options);
    this.on('tileAdded', function(t) {
      this.get_time_data(t, t.zoom);
    }, this);
    if(this._render.bind) {
      this._render = this._render.bind(this);
    } else {
      var self = this;
      var _old_render = this._render;
      this._render = function() {
        _old_render.apply(self, arguments);
      }
    }

    this.MAX_UNITS = this.options.steps + 2;
    this.entities = new Entities(7000);
    this.time = 0;
    this.queue = [];
    this.realTime = 0.0;
  },

  sql: function(sql, callback) {
    var self = this;
    this.base_url = 'http://' + this.options.user + '.cartodb.com/api/v2/sql';

    $.getJSON(this.base_url + "?q=" + encodeURIComponent(sql), function (data) {
        callback(data);
    });
  },

  get_time_range: function(callback) {
    var self = this;
    if(self.options.start_date != undefined) callback(self.options.start_date);

    var sql = "SELECT st_xmax(st_envelope(st_collect(the_geom))) xmax,st_ymax(st_envelope(st_collect(the_geom))) ymax, st_xmin(st_envelope(st_collect(the_geom))) xmin, st_ymin(st_envelope(st_collect(the_geom))) ymin, date_part('epoch',max({0})) max, date_part('epoch',min({0})) min FROM {1}".format(this.options.column, this.options.table);

    this.sql(sql, function (data) {
      var p = data.rows[0];
      self.options.start_date = p.min;
      callback(self.options.start_date);
          //p.max
    });

  },

  get_time_data: function (coord, zoom) {
    var self = this;
    this.table = this.options.table;

    if (!self.table) {
        return;
    }

    // get x, y for cells and sd, se for deforestation changes
    // sd contains the months
    // se contains the deforestation for each entry in sd
    // take se and sd as a matrix [se|sd]
    var numTiles = 1 << zoom;

    var sql = "WITH hgrid AS ( " +
    "    SELECT CDB_RectangleGrid( " +
    "       CDB_XYZ_Extent({0}, {1}, {2}), ".format(coord.x, coord.y, zoom) +
    "       CDB_XYZ_Resolution({0}) * {1}, ".format(zoom, self.options.resolution) +
    "       CDB_XYZ_Resolution({0}) * {1} ".format(zoom, self.options.resolution) +
    "    ) as cell " +
    " ) " +
    " SELECT  " +
    "    x, y, array_agg(c) vals, array_agg(f) vals_non_es ,array_agg(d) dates " +
    " FROM ( " +
    "    SELECT " +
    "      round(CAST (st_xmax(hgrid.cell) AS numeric),4) x, round(CAST (st_ymax(hgrid.cell) AS numeric),4) y, " +
    "      {0} c, sum(i.amount_world) f, floor((date_part('epoch',{1})- {2})/{3}) d ".format(self.options.countby, self.options.column, self.options.start_date, self.options.step) +
    "    FROM " +
    "        hgrid, {0} i ".format(self.options.table) +
    "    WHERE " +
    "        date_part('epoch',i.{0}) > {1} ".format(self.options.column, self.options.start_date) + 
    "        AND date_part('epoch',i.{0}) < {1} ".format(self.options.column, self.options.end_date) + 
    "        AND ST_Intersects(i.the_geom_webmercator, hgrid.cell) " +
    "    GROUP BY " +
    "        hgrid.cell, floor((date_part('epoch',{0}) - {1})/{2})".format(self.options.column, self.options.start_date, self.options.step) +
    " ) f GROUP BY x, y";
    self.sql(sql, function (data) {
      var time_data = self.pre_cache_months(data.rows, coord, zoom);
      self._tileLoaded(coord, time_data);
    });
  },


  pre_cache_months: function (rows, coord, zoom) {
    var row;
    var xcoords;
    var ycoords;
    var values;
    if (typeof(ArrayBuffer) !== undefined) {
        xcoords = new Float32Array(rows.length);
        ycoords = new Float32Array(rows.length);
        values = new Uint8Array(rows.length * this.MAX_UNITS);// 256 months
        values_non_es = new Uint8Array(rows.length * this.MAX_UNITS);// 256 months
    } else {
      alert("you browser does not support Typed Arrays");
      return;
    }
    // base tile x, y
    var total_pixels = 256 << zoom;

    for (var i in rows) {
        row = rows[i];
        pixels = meterToPixels(row.x, row.y, zoom); 
        xcoords[i] = pixels[0];
        ycoords[i] = (total_pixels - pixels[1]);
        var base_idx = i * this.MAX_UNITS;
        //def[row.sd[0]] = row.se[0];
        for (var j = 0; j < row.dates.length; ++j) {
            values[base_idx + row.dates[j]] = Math.min(Math.sqrt(row.vals[j])*window.BALL_SIZE_GAIN, 30);
            values_non_es[base_idx + row.dates[j]] = Math.min(Math.sqrt(row.vals_non_es[j])*window.BALL_SIZE_GAIN, 30);
            /*if (row.vals[j] > this.MAX_VALUE) {
                this.MAX_VALUE = row.vals[j];
                this.MAX_VALUE_LOG = Math.log(this.MAX_VALUE);
            }*/

        }
        /*
       for (var j = 1; j < this.MAX_UNITS; ++j) {
              values[base_idx + j] += values[base_idx + j - 1];
              if (values[base_idx + j] > this.MAX_VALUE) {
                  this.MAX_VALUE = values[base_idx + j];
                  this.MAX_VALUE_LOG = Math.log(this.MAX_VALUE);
              }
          }
          */

    }

    return {
        length: rows.length,
        xcoords: xcoords,
        ycoords: ycoords,
        values: values,
        values_non_es: values_non_es,
        size: 1 << (this.resolution * 2)
    };
  },

  /** 
   * starts the animation
   */
  play: function() {
    this.playing = true;
    //requestAnimationFrame(this._render);
  },

  _renderTile: function(tile, origin) {
      var xcoords = tile.xcoords;
      var ycoords = tile.ycoords;
      for(var i = 0; i < tile.length; ++i) {
        var cell = tile.values[this.MAX_UNITS * i + this.time];
        if (cell) {
          this.queue.push([xcoords[i],  ycoords[i], cell, 0]);
        }
        var cell = tile.values_non_es[this.MAX_UNITS * i + this.time];
        if (cell) {
          this.queue.push([xcoords[i],  ycoords[i], cell, 1]);
        }
      }
  },

  _render: function(delta) {
    this._canvas.width = this._canvas.width;
    var origin = this._map._getNewTopLeftPoint(this._map.getCenter(), this._map.getZoom());
    this._ctx.translate(-origin.x, -origin.y);
    this._ctx.fillStyle = 'rgba(0, 255,255, 0.01)';
    this._ctx.globalCompositeOperation = 'lighter';

    this.entities.update(delta);
    this.entities.render(this._ctx);

    this.realTime += delta*2;
    var newTime = (this.realTime>>0);
    if(newTime > this.time) {
      this.time = newTime;
      for(var i in this._tiles) {
        var tile = this._tiles[i];
        this._renderTile(tile, origin);
      }
    }

    if(this.queue.length) {
      var emit = Math.min(100, this.queue.length);
      //emit = 1;
      while(emit--) {
        var p = this.queue.pop();
        this.entities.add(p[0], p[1], p[2], p[3]);
      }
    }

  },

  getTime: function() {
    return new Date(1000*(this.options.start_date + this.time*15*60));
  }



});


var Entities = function(size, remove_callback) {
    this.x = new Float32Array(size);
    this.y = new Float32Array(size);
    this.life = new Float32Array(size);
    this.current_life = new Float32Array(size);
    this.remove = new Int32Array(size);
    this.type = new Int8Array(size);
    this.last = 0;
    this.size = size;
    this.sprites = []
    this.sprites.push(this.pre_cache_sprites(window.BALLS_COLOR_ES));
    this.sprites.push(this.pre_cache_sprites(window.BALLS_COLOR_NO_ES));
}

Entities.prototype.pre_cache_sprites = function(color) {
  var sprites = []
  for(var i = 0; i < 30; ++i) {
    var pixel_size = i*2 + 2;
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    ctx.width = canvas.width = pixel_size * 2;
    ctx.height = canvas.height = pixel_size * 2;
    ctx.fillStyle = color;//'rgba(0, 255,255, 0.12)';
    ctx.beginPath();
    ctx.arc(pixel_size, pixel_size, pixel_size, 0, Math.PI*2, true, true);
    ctx.closePath();
    ctx.fill();
    sprites.push(canvas);
  }
  return sprites;
}

Entities.prototype.add = function(x, y, life, type) {
  if(this.last < this.size) {
    this.x[this.last] = x;
    this.y[this.last] = y;
    this.life[this.last] = Math.min(life, 29);
    this.current_life[this.last] = 0;
    this.type[this.last] = type;
    this.last++;
  }
}

Entities.prototype.dead = function(i) {
  return false;
}

Entities.prototype.render= function(ctx) {
  var s, t;
  for(var i = 0; i < this.last ; ++i) {
    s = (this.current_life[i])>>0;
    t = this.type[i];
    //ctx.arc(this.x[i], this.y[i] ,3*this.life[i], 0, 2*Math.PI, true, true);
    ctx.drawImage(this.sprites[t][s], (this.x[i] - s*2)>>0, (this.y[i] - s*2)>>0);
  }
}

Entities.prototype.update = function(dt) {
    var len = this.last;
    var removed = 0;
    var _remove = this.remove;

    for(var i = len - 1; i >= 0; --i) {
        //var c = (this.life[i] -= this.life[i]*0.15);
        var diff = this.life[i] - this.current_life[i];
        this.current_life[i] += diff*dt*window.BALL_ANIMATION_SPEED;
        if(diff <= 0.05) {
          _remove[removed++] = i;
        }
    }

    for(var ri = 0; ri < removed; ++ri) {
      var r = _remove[ri];
      var last = this.last - 1;
      // move last to the removed one and remove it
      this.x[r] = this.x[last];
      this.y[r] = this.y[last];
      this.life[r] = this.life[last];
      this.current_life[r] = this.current_life[last]
      this.type[r] = this.type[last];

      this.last--;
    }
};



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
