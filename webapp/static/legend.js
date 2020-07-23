var legendHeight = 50, legendWidth = 300;

var colors = ["steelblue", "#fb9a99"];
var conf_colors = ['#2887a1', '#cf597e'];
// var text_colors = ['#ffffcc', '#c2e699', '#78c679', '#238443'];
var text_colors = ['#ffffcc', '#a1dab4', '#41b6c4', '#2c7fb8', '#253494'];

let colorSeq4 = ['#ffffcc', '#a1dab4', '#41b6c4', '#225ea8'];
let colorDiv7 = ['#008080', '#70a494', '#b4c8a8', '#f6edbd', '#edbb8a', '#de8a5a', '#ca562c'];
let colorDiv5 = ['#008080', '#70a494', '#f6edbd', '#de8a5a', '#ca562c'];
let colorCate = ['#6babc1', '#e68882', '#edc867', '#67a879', '#806691',];

colorCate = ['#e68882', '#6babc1'];
let borderColor = ['white', 'black'];
let gradientColor = [d3.lab("#91bfdb"),d3.lab("#ffffbf"),d3.lab("#fc8d59")]

var handleColor = "#969696", ruleColor = "#d9d9d9", gridColor = "#D3D3D3";
var nodeHighlightColor = "#e41a1c";
nodeHighlightColor = "#cccccc"
var font_family = "sans-serif";
var font_size = 10;
var font = font_size + "px " + font_family;
var legend_r = 5;

function render_legend_label(id) {
  d3.select(id).select('g').remove();
  var yoffset = 7;
  var indent = 20;

  var legend = d3.select(id)
      .style("width", legendWidth)
      .style("height", legendHeight)
      .append("g")
      .attr("transform", "translate(0, 4)");


	var g = legend.append("g")	
		.attr("class", "label legend")

	// color legend
	var r = legend_r;

	let xoffset = 0;
	target_names.forEach((name, i) => {
		g.append("circle")
			.attr("cx", indent + xoffset)
			.attr("cy", yoffset)
			.attr("r", r)
			.attr("fill", colorCate[i]);
		g.append("text")
			.attr("x", indent + 2 * r + xoffset)
			.attr("y", yoffset + r)
			.text(name);
		xoffset += ctx.measureText(name).width + r * 4 + indent;
	});

	// legend for range bar
	// let linear_gradient = legend.append('defs')
	//   .append('linearGradient')
 //      .attr('class','linear_gradient')
 //      .attr('id', function(d) {
 //        return "linear-gradient-legend";
 //      })
 //      .attr("x1", "0%")
 //      .attr("y1", "0%")
 //      .attr("x2", "100%")
 //      .attr("y2", "0%");

 //    linear_gradient.append('stop')
 //      .attr('class','linear_gradient_start')
 //      .attr('offset', '0%')
 //      .attr('stop-color', gradientColor[0]);

 //    linear_gradient.append('stop')
 //      .attr('class','linear_gradient_mid')
 //      .attr('offset', '50%')
 //      .attr('stop-color', gradientColor[1]);

 //    linear_gradient.append('stop')
 //      .attr('class','linear_gradient_end')
 //      .attr('offset', '100%')
 //      .attr('stop-color', gradientColor[2]);

 //    xoffset += indent;
 //    g.append('rect')
 //    	.attr('x', xoffset)
 //    	.attr('y', yoffset-r)
 //    	.attr('width', rectWidth)
 //    	.attr('height', 10)
 //    	.attr('fill', `url(#linear-gradient-legend)`)

 //    g.append('text')
 //    	.attr('x', xoffset + rectWidth + 5)
 //    	.attr('y', yoffset+r)
 //    	.text('range: low→median→high')


 	// color legend
  color_legend = legend.append('g')
    .classed('legend', true)
    .attr('id', 'color_scale')
    .attr('transform', `translate(${xoffset}, ${yoffset-r})`)
    .attr('visibility', "hidden")

  let linear_gradient = legend.append('defs')
        .append('linearGradient')
      .attr('id', "summary-linear-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    let stop_colors = ['#f0f0f0', '#969696', '#252525'];
    linear_gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', stop_colors[0]);

    linear_gradient.append('stop')
      .attr('offset', '50%')
      .attr('stop-color', stop_colors[1]);

    linear_gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', stop_colors[2]);

    color_legend.append('rect')
    	.attr('width', 60)
    	.attr('height', 10)
    	.attr('fill', `url(#summary-linear-gradient)`)

    color_legend.append('text')
     .attr('x',  65)
     .attr('y', 2*r-2)
     .text('range: low→high')

    // g.append('text')
    // 	.attr('x', xoffset +  + 80)
    // 	.attr('y', tree_height + view_margin.top + 10)
    // 	.text('accuracy: [0, 100%]')

    // if (NODE_ENCODING !== 'purity') {
    //   yoffset += indent
    //   g.append('rect')
    //     .attr('class', 'node_encoding_legend')
    //     .attr('x', indent-r)
    //     .attr('y', yoffset-r)
    //     .attr('width', rectWidth)
    //     .attr('height', 10)
    //     .attr('fill', `url(#summary-linear-gradient)`)

    //   g.append('text')
    //     .attr('class', 'node_encoding_legend')
    //     .attr('x', indent + rectWidth)
    //     .attr('y', yoffset+r)
    //     .text(() => {
    //       switch (NODE_ENCODING) {
    //         case 'accuracy':
    //           return `accuracy: [${filter_threshold['accuracy'][0]}, ${filter_threshold['accuracy'][1]}]`
    //         case 'fidelity':
    //           return `fidelity: [${filter_threshold['fidelity']}, 1]`
    //       }
    //     })
    //   } else {

    //   }
    
}

function update_legend() {
  let g = d3.select('.legend');

  g.selectAll('.node_encoding_legend').remove();
  let r = legend_r, indent = 20, yoffset=5;

  // if (NODE_ENCODING !== 'purity') {
  //     g.append('rect')
  //       .attr('class', 'node_encoding_legend')
  //       .attr('x', indent-r)
  //       .attr('y', yoffset-r)
  //       .attr('width', rectWidth)
  //       .attr('height', 10)
  //       .attr('fill', `url(#summary-linear-gradient)`)

  //     g.append('text')
  //       .attr('class', 'node_encoding_legend')
  //       .attr('x', indent + rectWidth)
  //       .attr('y', yoffset+r)
  //       .text(() => {
  //         switch (NODE_ENCODING) {
  //           case 'accuracy':
  //             return `accuracy: [${filter_threshold['accuracy'][0]}, ${filter_threshold['accuracy'][1]}]`
  //           case 'fidelity':
  //             return `fidelity: [${filter_threshold['fidelity']}, 1]`
  //         }
  //       })
  //   } 
}

