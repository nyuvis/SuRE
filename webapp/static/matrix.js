var mat_width = 400,
    mat_height = 400;

var mat_svg = d3.select("#rule_similarity")
    .attr("width", mat_width)
    .attr("height", mat_height)
    // .style("margin-left", -margin.left + "px")
  .append("g")
    // .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

function render_matrix(rule_similarity) {
  data = transform_table_to_json(rule_similarity)
  
  var x = d3.scaleBand().range([1, mat_width]),
    z = d3.scaleLinear().range([0,1]).domain([0,1])
    color = d3.scaleLinear().domain([0,1]).range(['#edf8fb', '#238b45'])
    // c = d3.scaleCategory10().domain(d3.range(10));

  var matrix = [],
      nodes = data.nodes,
      n = nodes.length;

  // Compute index per node.
  nodes.forEach(function(node, i) {
    node.index = i;
    node.count = 0;
    matrix[i] = d3.range(n).map(function(j) { return {x: j, y: i, z: 0}; });
  });

  // Convert links to matrix; count character occurrences.
  data.links.forEach(function(link) {
    matrix[link.source][link.target].z = +link.value;
    nodes[link.source].count += link.value;
    nodes[link.target].count += link.value;
  });

  // Precompute the orders.
  var orders = {
    count: d3.range(n).sort(function(a, b) { return nodes[b].count - nodes[a].count; }),
  };

  // The default sort order.
  x.domain(d3.range(nodes.length));
  // color.domain([0,d3.max(nodes, d =>d.count)])

  mat_svg.append("rect")
      .attr("class", "mat_background")
      .attr("fill", "white")
      .attr("width", mat_width)
      .attr("height", mat_height);

  var row = mat_svg.selectAll(".mat_row")
      .data(matrix)
    .enter().append("g")
      .attr("class", "mat_row")
      .attr("transform", function(d, i) { return "translate(0," + x(i) + ")"; })
      .each(row);

  row.append("line")
      .attr("x2", mat_width);

  // row.append("text")
  //     .attr("x", -6)
  //     .attr("y", x.rangeBand() / 2)
  //     .attr("dy", ".32em")
  //     .attr("text-anchor", "end")
  //     .text(function(d, i) { return nodes[i].name; });

  var column = mat_svg.selectAll(".mat_column")
      .data(matrix)
    .enter().append("g")
      .attr("class", "mat_column")
      .attr("transform", function(d, i) { return "translate(" + x(i) + ")rotate(-90)"; });

  column.append("line")
      .attr("x1", -mat_width);

  // column.append("text")
  //     .attr("x", 6)
  //     .attr("y", x.rangeBand() / 2)
  //     .attr("dy", ".32em")
  //     .attr("text-anchor", "start")
  //     .text(function(d, i) { return nodes[i].name; });

  function row(row) {
    var cell = d3.select(this).selectAll(".cell")
        .data(row.filter(function(d) { return d.z; }))
      .enter().append("rect")
        .attr("class", "cell")
        .attr("x", function(d) { return x(d.x); })
        .attr("width", x.bandwidth())
        .attr("height", x.bandwidth())
        // .style("fill-opacity", function(d) { return z(d.z); })
        .style("fill", d=>{
          if (d.z > 1) console.log(d.x, d.y, d.z)
          return color(d.z)
        })
        // .style("fill", function(d) { return nodes[d.x].group == nodes[d.y].group ? c(nodes[d.x].group) : null; })
        .on("mouseover", mouseover)
        .on("mouseout", mouseout);
  }

  function mouseover(p) {
    d3.selectAll(".row text").classed("active", function(d, i) { return i == p.y; });
    d3.selectAll(".column text").classed("active", function(d, i) { return i == p.x; });
  }

  function mouseout() {
    d3.selectAll("text").classed("active", false);
  }

  // d3.select("#order").on("change", function() {
  //   clearTimeout(timeout);
  //   order(this.value);
  // });

  function order(value) {
    x.domain(orders[value]);

    var t = mat_svg.transition().duration(2500);

    t.selectAll(".mat_row")
        .delay(function(d, i) { return x(i) * 4; })
        .attr("transform", function(d, i) { return "translate(0," + x(i) + ")"; })
      .selectAll(".cell")
        .delay(function(d) { return x(d.x) * 4; })
        .attr("x", function(d) { return x(d.x); });

    t.selectAll(".mat_column")
        .delay(function(d, i) { return x(i) * 4; })
        .attr("transform", function(d, i) { return "translate(" + x(i) + ")rotate(-90)"; });
  }

  order("count");

  // var timeout = setTimeout(function() {
  //   order("count");
  //   d3.select("#order").property("selectedIndex", 2).node().focus();
  // }, 5000);
}

function transform_table_to_json(rule_similarity) {
  nodes = [];
  links = [];
  rule_similarity.forEach((d,i) => {
    nodes.push({
      'name': 'rule1',
      'node_id': listData[i]['node_id'],
    });
    for (j = 0; j < rule_similarity.length; j++) {
      links.push({
        "source": i, "target": j, "value": rule_similarity[i][j],
      })
    }
  });

  return {"nodes": nodes, "links": links}
}


