var legendHeight = 50, legendWidth = 300;

var colors = ["steelblue", "#fb9a99"];
var conf_colors = ['#2887a1', '#cf597e'];
// var text_colors = ['#ffffcc', '#c2e699', '#78c679', '#238443'];
var text_colors = ['#ffffcc', '#a1dab4', '#41b6c4', '#2c7fb8', '#253494'];

let colorSeq4 = ['#ffffcc', '#a1dab4', '#41b6c4', '#225ea8'];
let colorDiv7 = ['#008080', '#70a494', '#b4c8a8', '#f6edbd', '#edbb8a', '#de8a5a', '#ca562c'];
let colorDiv5 = ['#008080', '#70a494', '#f6edbd', '#de8a5a', '#ca562c'];
let colorCate = ['#6babc1', '#e68882', '#edc867', '#67a879', '#806691',];

colorCate = ['#6babc1', '#e68882',];
let borderColor = ['white', 'black'];
let gradientColor = [d3.lab("#91bfdb"),d3.lab("#ffffbf"),d3.lab("#fc8d59")]

var handleColor = "#969696", ruleColor = "#d9d9d9", gridColor = "#D3D3D3";
var nodeHighlightColor = "#e41a1c";
nodeHighlightColor = "#cccccc"
var font_family = "sans-serif";
var font_size = 10;
var font = font_size + "px " + font_family;
var legend_r = 7;

let selected_prediction = -1;

function render_legend_label(id) {
  d3.select(id).select('g').remove();
  var yoffset = 7;
  var indent = 20;

  var legend = d3.select(id)
      .style("width", legendWidth)
      .style("height", legendHeight)
      .append("g")
      .attr("class", "label legend")
      .attr("transform", "translate(0, 4)");

	// color legend
	let xoffset = 0;

  g = legend.selectAll('.legend_color')
    .data(target_names)
    .enter()
    .append('g')
    .attr('class', 'legend_color')
    .attr('id', (d, i) => `predgroup-${i}`)
    .attr("transform", (d,i) => `translate(${i * 100}, ${yoffset})`);

  g.append("circle")
     .attr('id', (d, i) => `prediction-${i}`)
     .attr("cx", indent)
     .attr("cy", 0)
     .attr("r", legend_r)
     .style("fill", (d, i) => {
        if (goal_debug < 0) return colorCate[i];
        if (i == 0) return`url(#fp_pattern)`;
        return "url(#fn_pattern)"
     })
     .on('click', function() {
        let pid = +this.id.split('-')[1];
        set_prediction_filter(pid);
      });
  g.append('text')
    .attr('x', 2 * legend_r + indent)
    .attr('y', legend_r /2)
    .text(d => d)
}

