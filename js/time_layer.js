
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
    this._render = this._render.bind(this);
    this.entities = new Entities(1000);
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
    if(self.MIN_DATE != undefined) callback(self.options.MIN_DATE);

    var sql = "SELECT st_xmax(st_envelope(st_collect(the_geom))) xmax,st_ymax(st_envelope(st_collect(the_geom))) ymax, st_xmin(st_envelope(st_collect(the_geom))) xmin, st_ymin(st_envelope(st_collect(the_geom))) ymin, date_part('epoch',max({0})) max, date_part('epoch',min({0})) min FROM {1}".format(this.options.column, this.options.table);

    this.sql(sql, function (data) {
      var p = data.rows[0];
      self.options.MIN_DATE = p.min;
      callback(self.options.MIN_DATE);
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

    //var prof = Profiler.get('tile fetch');
    //prof.start();
    this.get_time_range(function() {
      var sql = "WITH hgrid AS ( " +
      "    SELECT CDB_RectangleGrid( " +
      "       CDB_XYZ_Extent({0}, {1}, {2}), ".format(coord.x, coord.y, zoom) +
      "       CDB_XYZ_Resolution({0}) * {1}, ".format(zoom, self.options.resolution) +
      "       CDB_XYZ_Resolution({0}) * {1} ".format(zoom, self.options.resolution) +
      "    ) as cell " +
      " ) " +
      " SELECT  " +
      "    x, y, array_agg(c) vals, array_agg(d) dates " +
      " FROM ( " +
      "    SELECT " +
      "      round(CAST (st_xmax(hgrid.cell) AS numeric),4) x, round(CAST (st_ymax(hgrid.cell) AS numeric),4) y, " +
      "      {0} c, floor((date_part('epoch',{1})- {2})/{3}) d ".format(self.options.countby, self.options.column, self.options.MIN_DATE, self.options.step) +
      "    FROM " +
      "        hgrid, {0} i ".format(self.options.table) +
      "    WHERE " +
      "        ST_Intersects(i.the_geom_webmercator, hgrid.cell) " +
      "    GROUP BY " +
      "        hgrid.cell, floor((date_part('epoch',{0})- {1})/{2})".format(self.options.column, self.options.MIN_DATE, self.options.step) +
      " ) f GROUP BY x, y";
      self.sql(sql, function (data) {
        var time_data = self.pre_cache_months(data.rows, coord, zoom);
        self._tileLoaded(coord, time_data);
      });
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
        values = new Uint8Array(new ArrayBuffer(rows.length * this.MAX_UNITS));// 256 months
    } else {
      alert("you browser does not support Typed Arrays");
      return;
    }
    // base tile x, y
    var total_pixels = 256 << zoom;

    this._ctx.fillStyle = '#F00';

    for (var i in rows) {
        row = rows[i];
        pixels = meterToPixels(row.x, row.y, zoom); 
        xcoords[i] = pixels[0];
        ycoords[i] = (total_pixels - pixels[1]);
        var base_idx = i * this.MAX_UNITS;
        //def[row.sd[0]] = row.se[0];
        for (var j = 0; j < row.dates.length; ++j) {
            values[base_idx + row.dates[j]] = row.vals[j];
            if (row.vals[j] > this.MAX_VALUE) {
                this.MAX_VALUE = row.vals[j];
                this.MAX_VALUE_LOG = Math.log(this.MAX_VALUE);
            }

        }
    }

    return {
        length: rows.length,
        xcoords: xcoords,
        ycoords: ycoords,
        alues: values,
        size: 1 << (this.resolution * 2)
    };
  },

  _renderTile: function(tile, origin) {
      var xcoords = tile.xcoords;
      var ycoords = tile.ycoords;
      for(var i = 0; i < tile.length; ++i) {
        this.entities.add(xcoords[i],  ycoords[i]);
      }
  },

  _render: function() {
    this._canvas.width = this._canvas.width;
    var origin = this._map._getNewTopLeftPoint(this._map.getCenter(), this._map.getZoom());
    for(var i in this._tiles) {
      var tile = this._tiles[i];
      this._renderTile(tile, origin);
    }
    this._ctx.translate(-origin.x, -origin.y);
    this._ctx.fillStyle = 'rgba(0, 100, 0, 0.1)';
    this.entities.render(this._ctx);
  }

});


var Entities = function(size, remove_callback) {
    this.x = new Float32Array(size);
    this.y = new Float32Array(size);
    this.life = new Float32Array(size);
    this.last = 0;
    this.size = size;
}

Entities.prototype.add = function(x, y) {
  if(this.last < this.size) {
    this.x[this.last] = x;
    this.y[this.last] = y;
    this.life = 10;
    this.last++;
  }
}

Entities.prototype.dead = function(i) {
  return false;
}

Entities.prototype.render= function(ctx) {
  for(var i = 0; i < this.last ; ++i) {
    ctx.beginPath();
    ctx.arc(this.x[i], this.y[i] , 10, 0, 2*Math.PI, true, true);
    //ctx.fillRect(this.x[i], this.y[i] , 10, 10 );
    ctx.closePath();
    ctx.fill();
  }
}

Entities.prototype.update = function(dt) {
    var len = this.last;
    var remove = [];
    for(var i = 0; i < len; ++i) {
        var c = this.life[i] -= 0.5;
        if(c < 0) {
          remove.push(i);
        }
    }

    for(var r in remove) {
      var last = this.last - 1;
      // move last to the removed one and remove it
      this.x[r] = this.x[last];
      this.y[r] = this.y[last];
      this.life[r] = this.life[last];
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
