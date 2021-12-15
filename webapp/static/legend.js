let legendHeight = 50, legendWidth = 600;

let colors = ["steelblue", "#fb9a99"];
let conf_colors = ['#2887a1', '#cf597e'];
let text_colors = ['#ffffcc', '#a1dab4', '#41b6c4', '#2c7fb8', '#253494'];

let colorSeq4 = ['#ffffcc', '#a1dab4', '#41b6c4', '#225ea8'];
let colorDiv7 = ['#008080', '#70a494', '#b4c8a8', '#f6edbd', '#edbb8a', '#de8a5a', '#ca562c'];
let colorDiv5 = ['#008080', '#70a494', '#f6edbd', '#de8a5a', '#ca562c'];

let colorCate = ['#6babc1', '#e68882', '#edc867', '#67a879', '#806691', '#fdb462', '#b3de69', '#fccde5'];

let conf_fill = [];

// colorCate = ['#6babc1', '#e68882',];
let borderColor = ['white', 'black'];
let gradientColor = [d3.lab("#91bfdb"),d3.lab("#ffffbf"),d3.lab("#fc8d59")]

let handleColor = "#969696", ruleColor = "#d9d9d9", gridColor = "#D3D3D3";
let nodeHighlightColor = "#e41a1c";
nodeHighlightColor = "#cccccc"
let font_family = "sans-serif";
let font_size = 10;
let font = font_size + "px " + font_family;
let legend_r = 7;

let selected_prediction = -1;

function render_legend_label(id) {
  d3.select(id).select('g').remove();
  let yoffset = 7;
  let indent = 20;

  let legend = d3.select(id)
      .style("width", legendWidth)
      .style("height", legendHeight)
      .append("g")
      .attr("class", "label legend")
      .attr("transform", "translate(0, 4)");

	// color legend
	let xoffset = 0, to_render = [];
  for (let i = 0; i < target_names.length; i++) {
    to_render.push({
      'x': xoffset,
      'name': target_names[i],
      'y': yoffset,
    });
    xoffset += legend_r * 2 + indent + ctx.measureText(target_names[i]).width * .85;
    if (xoffset > 450) {
      xoffset = 0;
      yoffset += indent/2 + legend_r * 2;
    }
  }

  to_render.push({
    'x': xoffset,
    'name': 'incorrect',
    'y': yoffset,
  });

  if (yoffset > 10) {
    d3.select('#legend_div')
    .style('height', `${12+yoffset}px`);
  }

  g = legend.selectAll('.legend_color')
    .data(to_render)
    .enter()
    .append('g')
    .attr('class', 'legend_color')
    .attr('id', (d, i) => `predgroup-${i}`)
    .attr("transform", (d,i) => `translate(${d.x}, ${d.y})`);

  g.append("circle")
     .attr('id', (d, i) => `prediction-${i}`)
     .attr("cx", indent)
     .attr("cy", 0)
     .attr("r", legend_r)
     .style("fill", (d, i) => {
        if (i < target_names.length) return colorCate[i];
        return "url(#false_pattern)";
        // if (goal_debug < 0) return colorCate[i];
        // if (i == 0) return`url(#fp_pattern)`;
        // return "url(#fn_pattern)"
     })
     // .on('click', function() {
     //    let pid = +this.id.split('-')[1];
     //    set_prediction_filter(pid);
     //  });

  g.append('text')
    .attr('x', 2 * legend_r + indent)
    .attr('y', legend_r /2)
    .text(d => d.name);

  prepare_conf_fill();
}

function render_lattice_size_legend(id) {
  d3.select(id).select('g').remove();
  let yoffset = 2, xoffset = 7;
  let indent = 20;

  let legend = d3.select(id)
      .style("width", legendWidth)
      .style("height", summary_size_.range()[1]+2)
      .append("g")
      .attr("transform", `translate(${indent}, 2)`);

  let ranges = [0.3, .6, .9];

  ranges.forEach((val) => {
    let size = summary_size_(tot_train*val)
    legend.append('rect')
      .attr('x', xoffset)
      .attr('y', summary_size_.range()[1] /2 - size / 2)
      .attr('width', size)
      .attr('height', size)
      .attr('fill', 'lightgrey')
      .attr('stroke','none');
    legend.append('text')
      .attr('x', xoffset + size + 2)
      .attr('y', yoffset + summary_size_.range()[1] /2)
      .text(`${val*100}%`);
    xoffset += size + 10 + indent*2;
  })
}

function render_list_size_legende(id, start) {
  d3.select(id).select('g').remove();
  let yoffset = 2, xoffset = 0;
  let indent = 20;

  let legend = d3.select(id)
      .style("width", legendWidth)
      .style("height", glyphCellHeight+5)
      .append("g")
      .attr("transform", `translate(${start}, 2)`);

  let ranges = [0.3, .6, .9];

  ranges.forEach((val) => {
    let size = summary_size_(tot_train*val) * 2
    legend.append('rect')
      .attr('x', xoffset)
      .attr('width', size)
      .attr('height', glyphCellHeight)
      .attr('fill', 'lightgrey')
      .attr('stroke','none');
    legend.append('text')
      .attr('x', xoffset + size + 2)
      .attr('y', 10)
      .text(`${val*100}%`);
    xoffset += size + 10 + indent*2;
  })
}

function prepare_conf_fill() {
  conf_fill = [];

  let false_patterns = d3.select('#false_pattern_svg');

  false_patterns.selectAll('.false_class')
    .remove();

  target_names.forEach((d, i) => {
    // create new false patterns
    let pattern = false_patterns.append("pattern")
      .attr("id", `false-class-${i}`)
      .attr("class", 'false_class')
      .attr("patternUnits", "userSpaceOnUse")
      .attr("width", "4")
      .attr("height", "4");

    pattern.append('rect')
      .attr('width', 4)
      .attr('height', 4)
      .attr('fill', colorCate[i]);

    pattern.append('path')
      .attr('d', "M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2");

    // add pattern id to conf_fill
    conf_fill.push(`url(#false-class-${i})`);
    conf_fill.push(colorCate[i]);
  })
}

