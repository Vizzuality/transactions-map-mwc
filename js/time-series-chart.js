function timeSeriesChart() {
  var margin = {top: 20, right: 20, bottom: 20, left: 20},
      width = 760,
      height = 120,
      xValue = function(d) { return d[0]; },
      yValue = function(d) { return d[1]; },
      xScale = d3.time.scale(),
      yScale = d3.scale.linear(),
      area = d3.svg.area().x(X).y1(Y),
      line = d3.svg.line().x(X).y(Y);

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
          .range([height, 0]);

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
          p = data[i]
          ctx.lineTo(xScale(p[0]), yScale(p[1][v]));
        }
        ctx.lineTo(xScale(p[0]), height);
        ctx.stroke();
        ctx.fill();
      }

      canvas.forEach(function(c, v) {
        var p;
        var ctx = c[0].getContext('2d');
        ctx.fillStyle = 'rgba(49, 191, 255, 0.25)';
        ctx.strokeStyle = 'rgba(49, 191, 255, 1)';
        renderGraph(ctx, 0)
        ctx.fillStyle = 'rgba(255, 0, 255, 0.25)';
        ctx.strokeStyle = 'rgba(255, 0, 255, 1)';
        renderGraph(ctx, 1)
      });

/*
      gEnter.append("path").attr("class", "area");
      gEnter.append("path").attr("class", "line");
      gEnter.append("g").attr("class", "x axis");

*/

      
      /*
      // Update the outer dimensions.

      // Update the inner dimensions.
      var g = svg.select("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      // Update the area path.
      g.select(".area")
          .attr("d", area.y0(yScale.range()[0]));

      // Update the line path.
      g.select(".line")
          .attr("d", line);

      // Update the x-axis.
      // */
      /*
      g.select(".x.axis")
          .attr("transform", "translate(0," + yScale.range()[0] + ")")
          .call(xAxis);
      */
    });
  }

  // The x-accessor for the path generator; xScale ∘ xValue.
  function X(d) {
    return xScale(d[0]);
  }

  // The x-accessor for the path generator; yScale ∘ yValue.
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

  return chart;
}
