let depth_height = 50;
let view_width = 980;
let max_r = 15;

let summary_x,
	summary_y,
	tree_height = 500,
	summary_size,
  summary_size_,
  fidelity_color,
	summary_opacity;

let summary_color;
let stop_colors = ['#fc8d59', '#ffffbf', '#91bfdb'];
stop_colors = ['#e66101', '#f3eeea', '#7b3294', ]
stop_colors = ['#d7191c', '#ffffbf', '#2c7bb6'];
stop_colors = ['#e66101', '#dfc27d', '#018571'];

let view_margin = {left:5+max_r, right:max_r, top:max_r*2, bottom:max_r};
let x_tick_height = 18;

let summary_x_tick = d3.select('#summary_x_tick')
    .attr('transform', 'translate(15)')
    .style('width', `${view_width+view_margin.left+view_margin.right}px`)
    .style('height', `${x_tick_height}px`);

let x_axis = d3.axisBottom()
    .scale(summary_x);

let pie = d3.pie()
  .value(d => d);

let clicked_summary_node_id = -1;
let clicked_tree_level = -1;

function intialize_scales(max_depth) {
	tree_height = max_depth * depth_height;
  d3.select('#summary_div')
    .style("height", `${hist_height+hist_margin.top+hist_margin.bottom}px`);

  let min_support = filter_threshold['support'] / d3.sum(node_info[0]['value']);

	summary_x = d3.scaleLinear()
		.domain([filter_threshold['fidelity'], 1])
		.range([view_margin.left, view_margin.left+view_width]);

	summary_y = d3.scaleLinear()
		.domain([0, max_depth])
		.range([view_margin.top, tree_height+view_margin.top]);

	summary_size = d3.scaleLinear()
		.domain([min_support, 1])
		.range([2, max_r]);

  summary_size_ = d3.scaleLinear()
    .domain([min_support, 1])
    .range([2*3, max_r*2]);

	summary_color = d3.scaleLinear()
		.domain([.5, .7, 1])
		.range(stop_colors)

  fidelity_color = d3.scaleLinear()
      .domain([filter_threshold['fidelity'], (filter_threshold['fidelity']+1)/2, 1])
      .range(stop_colors)

  // initialize tree settings
  tree = d3.tree()
    .size([ view_width, tree_height,]);

  // diagonal = d3.svg.diagonal()
  //   .projection(function(d) { return [d.x, d.y]; });
  // diagonal = d3.linkHorizontal()
  //   .x(d => d.x)
  //   .y(d => d.y);
}

// node_info contains the information of nodes: support, accuracy, fidelity
function render_summary(node_info, max_depth) {
  d3.select('#summary_view > *').remove();
	intialize_scales(max_depth);

  // check boxes before different levels
  // d3.select("#radio_group").selectAll("input")
  //   .data(d3.range(max_depth+1)).enter()
  //   .append("input")
  //   .attr("name", "tree_level")
  //   .attr("type", "radio")
  //   .attr("value", (idx) => `level-${idx}`)
  //   .on("click", (idx) => {
  //     click_tree_level(idx);
  //   });

	// start rendering
	let view = d3.select('#summary_view')
		.style('width', `${view_width+view_margin.left+view_margin.right}px`)
		.style('height', `${tree_height+view_margin.top+view_margin.bottom}px`)

	// level/depth info
	let depth_info = view.selectAll('.depth-line')
		.data(d3.range(max_depth+1))
        .enter().append("g")
        .attr("class", "depth-line")
        .attr("transform", function(d, i) { return `translate(0, ${summary_y(i)})`; })

	depth_info.append("line")
        .attr("x1", view_margin.left)
        .attr("x2", view_width+view_margin.left)
        .attr("id", d => `depth-${d}`)
        .style('stroke-width', .5)
        .style("stroke", gridColor);
  depth_info.append('text')
      .attr('x', view_margin.left - 5)
      .style('fill', gridColor)
      .style('text-anchor', 'end')
      .text((d, i) => i)
}


function update_summary(node_info, ) {
  if (SUMMARY_LAYOUT == 'stat') {
    d3.selectAll('#summary_view > *:not(.depth-line)').remove();
  
    update_stat(node_info);
  } else if (SUMMARY_LAYOUT == 'tree') {
    d3.selectAll('#summary_x_tick > *').remove();
    d3.selectAll('#summary_view > *:not(.depth-line)').remove();

    let visible_tree = {};
    Object.assign(visible_tree, treeData);
    update_treeData(visible_tree)
    generate_tree(visible_tree);
  }
}

function update_treeData(visible_tree) {
  if (visible_tree.children === undefined) return;
  for (let i = visible_tree.children.length-1; i >=0; i--) {
    let d = visible_tree.children[i];
    if (!new_node_shown[d['node_id']]) {
      visible_tree.children.pop();
    } else {
      update_treeData(visible_tree.children[i]);
    }
  }
}
