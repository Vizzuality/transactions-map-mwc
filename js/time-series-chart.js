function timeSeriesChart() {
  var margin = {top: 20, right: 20, bottom: 20, left: 20},
      width = 760,
      height = 100,
      xValue = function(d) { return d[0]; },
      yValue = function(d) { return d[1]; },
      xScale = d3.time.scale(),
      yScale = d3.scale.linear(),
      area = d3.svg.area().x(X).y1(Y),
      line = d3.svg.line().x(X).y(Y),
      only_stroke = false,
      stroke_opacity = 1;

  function chart(selection) {
    selection.each(function(data) {
      var max = data.max;

      // Convert data to standard representation greedily;
      // this is needed for nondeterministic accessors.
      data = data.map(function(d, i) {
        return [xValue.call(data, d, i), yValue.call(data, d, i)];
      });

      // Update the x-scale.
      xScale
          .domain(d3.extent(data, function(d) { return d[0]; }))
          .range([0, width - margin.left - margin.right]);

      // Update the y-scale.
      yScale
          .domain([0, max])
          .range([height - 3, 0]);

      // Select the svg element, if it exists.
      //var svg = d3.select(this).selectAll("svg").data([data]);
      //var svg = d3.select(this).append('svg');
      var canvas = d3.select(this).append("canvas");
      canvas.attr("width", width)
            .attr("height", height);

      var renderGraph = function(ctx, v) {
        ctx.beginPath();
        ctx.moveTo(0, height)
        for(var i = 0; i < data.length; ++i) {
          p = data[i];
          if(v==1){
            ctx.lineTo(xScale(p[0]), yScale(p[1][v]+p[1][0]));
          }else{
            ctx.lineTo(xScale(p[0]), yScale(p[1][v]));
          }
        }
        ctx.lineTo(xScale(p[0]), height);
        ctx.stroke();
        if(!only_stroke){
          ctx.fill();
        }
      }

      canvas.forEach(function(c, v) {
        var p;
        var ctx = c[0].getContext('2d');
        ctx.fillStyle = 'rgba(242, 200, 242, 1)';
        ctx.strokeStyle = 'rgba(255, 0, 255, ' + stroke_opacity + ')';
        renderGraph(ctx, 1)
        ctx.fillStyle = 'rgba(202, 240, 252, 1)';
        ctx.strokeStyle = 'rgba(49, 191, 255, ' + stroke_opacity + ')';
        renderGraph(ctx, 0)
      });

    });
  }

  // The x-accessor for the path generator; xScale ∘ xValue.
  function X(d) {
    return xScale(d[0]);
  }

  // The y-accessor for the path generator; yScale ∘ yValue.
  function Y(d) {
    return yScale(d[1]);
  }

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin = _;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  chart.stroke_opacity = function(_) {
    stroke_opacity = _;
    return this;
  }
  chart.only_stroke = function(_) {
    only_stroke = _;
    return this;
  }

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
  };

  chart.x = function(_) {
    if (!arguments.length) return xValue;
    xValue = _;
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return yValue;
    yValue = _;
    return chart;
  };

  chart.xScale = function() { return xScale; }
  chart.yScale = function() { return yScale; }

  return chart;
}
