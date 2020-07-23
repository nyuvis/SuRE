
let graph_width = 280,
    graph_height = 280,
    simulation;

d3.select('#graph')
        .style('width', graph_width)
        .style('height', graph_height);

function render_graph(graph_nodes, graph_links) {
    let graph_svg = d3.select('#graph');
    graph_svg.selectAll('*').remove();

    // let k = Math.sqrt(graph_nodes.length / (graph_width * graph_height));
    let distScale = d3.scaleLinear()
      .domain([0, d3.max(graph_links, d => d.distance)])
      .range([0, graph_width*.5])

    simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(function(d) { return d.id; })
            .distance(function(d) { return distScale(d.distance)})
        )
        // .force("charge", d3.forceManyBody().strength(-10/k))
        .force("center", d3.forceCenter(graph_width / 2, graph_height / 2));


    let sizeScale = d3.scaleSqrt()
      .domain([filter_threshold['support'], d3.max(graph_nodes, function(d) {return d.size})])
      .range([2, 10])
    let widthScale = d3.scaleLinear()
      .domain([d3.min(graph_nodes, function(d) {return d.size}), d3.max(graph_nodes, function(d) {return d.size})])
      .range([2, 20])

    let link = graph_svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(graph_links)
        .enter().append("line")
        .attr('id', d => `link-${d.source}-${d.target}`)
        .style("stroke-width", function(d) { return  widthScale(d.common); });

    let node = graph_svg.append("g")
        .attr("class", "nodes")
        .selectAll("g")
        .data(graph_nodes)
        .enter().append("g");
    
    let circles = node.append("circle")
        .attr("id", d => `node-${d.id}`)
        .attr("r", function(d) { return sizeScale(d.size)})
        .attr("fill", function(d) { return colorCate[d.pred]; })
        .call(d3.drag()
              .on("start", dragstarted)
              .on("drag", dragged)
              .on("end", dragended));

    // node.append('text')
    //   .text(d=> `${Math.floor(d.size)}`)

    node.on('mouseover', (d) => {
        let r_i = rid2rix[d['id']];
        hover_rule(d3.select(`#ruleg-${""}-${r_i}`), r_i, listData[r_i], "");
    }).on('mouseout', (d)=> {
        rule_unhover("", rid2rix[d['id']]);
    }).on('click', function (d) {
        let r_i = rid2rix[d['id']];
        clicked_rule_idx = r_i;
        click_rule(d3.select(this), r_i, d, "");
    })

    simulation
      .nodes(graph_nodes)
      .on("tick", ticked);

    simulation.force("link")
      .links(graph_links);

    function ticked() {
        link
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node
            .attr("transform", function(d) {
              return "translate(" + d.x + "," + d.y + ")";
            })
    }
}

function dragstarted(d) {
  if (!d3.event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(d) {
  d.fx = d3.event.x;
  d.fy = d3.event.y;
}

function dragended(d) {
  if (!d3.event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}