let hist_size = [80, 50],
	proj_size = [200, 200]
	hist_width = hist_size[0],
	hist_height = hist_size[1];

let hist_margin = {'top': 5, 'bottom': 15, left:5, right:5};
let summary_height = 18, 
		summary_bar_width = 80,
		summary_bar_height = 10;
let proj_x = d3.scaleLinear().range([0, proj_size[0]]),
	proj_y = d3.scaleLinear().range([0, proj_size[1]]);

function render_stat_summary(summary_info) {
	d3.selectAll('#selection_coverage *').remove();

	let svg = d3.select('#selection_coverage')
		.attr('height', summary_height * 5 + summary_bar_height)
		// .attr('height', summary_height * 5 + summary_bar_height + 22*hist_height)

	d3.select('#selection_coverage')
		.attr('height', summary_height * 5 + summary_bar_height)

	let margin = {left: 5, top: -10},
		xoffset = 50;

	let stat = svg.append('g')
		.attr("class", "stat_summary")
		.attr('transform', `translate(${margin.left}, ${margin.top})`);

	let key_list = ['support', 'tp', 'fp', 'tn', 'fn'];
	let size_list = [
		d3.sum(node_info[0]['value']),
		Math.floor(node_info[0]['conf_mat'][0][0] * d3.sum(node_info[0]['value'])),
		Math.floor(node_info[0]['conf_mat'][0][1] * d3.sum(node_info[0]['value'])),
		Math.floor(node_info[0]['conf_mat'][1][1] * d3.sum(node_info[0]['value'])),
		Math.floor(node_info[0]['conf_mat'][1][0] * d3.sum(node_info[0]['value'])),
	];
	let conf_fill = ['lightgrey', colorCate[0], 'url(#fp_pattern_white)', colorCate[1], `url(#fn_pattern_white)`,];

	for (let i = 0; i < 5; i++) {
		stat.append('text')
			.attr('x', 0)
			.attr('y', summary_height * (i+1) + summary_bar_height)
			.text(key_list[i]);
		stat.append('rect')
			.attr('x', xoffset)
			.attr('y', summary_height * (i+1))
			.classed('summary_back_bar', true);
		stat.append('rect')
			.attr('x', xoffset)
			.attr('y', summary_height * (i+1))
			.classed('summary_front_bar', true)
			.style('fill', conf_fill[i])
			.attr('width', summary_bar_width * summary_info[key_list[i]]/ size_list[i]);
		stat.append('text')
			.attr('x', xoffset+2)
			.attr('y', summary_height * (i+1) + summary_bar_height)
			.attr('class', 'des_text')
			.text(`${summary_info[key_list[i]]} / ${size_list[i]}`);
	}
	// render_projection();

	// render_histogram();

	// render_histogram(svg);

	// let node_list = [];

	// Object.keys(multiple_selection).forEach((node_id) => node_list.push(+node_id));
	// postData("get_histogram", node_list, (res) => {
	// 	covered_hist = res['res'];
	// 	update_histogram(covered_hist);
	// })
}

function render_projection() {
	let proj_svg = d3.select("#projection");

	let proj_dict = [];
	projection.forEach((d) => {
		proj_dict.push({'x': d[0], 'y': d[1]});
	})
	proj_x.domain([d3.min(proj_dict, d=>d.x), d3.max(proj_dict, d=>d.x)]);
	proj_y.domain([d3.min(proj_dict, d=>d.y), d3.max(proj_dict, d=>d.y)]);
	proj_svg.selectAll('.pos')
		.data(proj_dict)
		.enter()
		.append('circle')
		.attr('class', 'pos')
		.attr('cx', d => proj_x(d.x))
		.attr('cy', d => proj_y(d.y))
		.attr('r', 1);
}

function update_projection() {


}

function render_histogram_curve(svg) {
	let max_hist = d3.max(histogram, (d) => d3.max(d['hist']));

	let y = d3.scaleLinear().domain([0, max_hist])
		.range([hist_height-hist_margin.bottom ,hist_margin.top]);
	let x = d3.scaleLinear().domain([0, histogram[0]['hist'].length])
		.range([hist_margin.left, hist_width-hist_margin.right]);

	let hist = svg.append('g')
		.attr('id', 'histogram');

	let reverse_col_order = {};
	let histEnter = hist.selectAll('.hist')
		.data(histogram)
		.enter()
		.append('g')
		.attr('class', 'hist')
		.attr('id', (d, i) => `hist_group_${i}`)
		.attr('transform', (d,i) => 
			`translate(0, ${summary_height * 5 + summary_bar_height*2 + col_order[i] * hist_height})`);

	// attr name
	histEnter.append('text')
		.attr('x', 0)
		.attr('y', 0)
		.text((d, i) => {
			return attrs[i]
		});

	// attr distribution
	histEnter.append('rect')
		.attr('x', hist_margin.left)
		.attr('y', hist_margin.top)
		.attr('width', hist_width-hist_margin.right-hist_margin.left)
		.attr('height', hist_height-hist_margin.top-hist_margin.bottom)
		.attr('fill', 'white')
		.attr('stroke', 'lightgrey');

	let line_function = d3.line()
		.x((d) => x(d.x))
		.y(d => y(d.y));

	histEnter.append('path')
		.attr('class', 'hist_line')
		.attr('d', d => {
			let values = [{x: 0, y: 0}];
			d['hist'].forEach((h, i) => values.push({x: i+1, y: h}));
			values.push({x: d['hist'].length, y:0});

			return line_function(values)
		})
		.style('stroke', 'darkgrey')
		.style('fill', 'darkgrey')
		.style('fill-opacity', .5)
}

function render_histogram() {
	let max_hist = d3.max(histogram, (d) => d3.max(d['hist']));

    let y = d3.scaleLinear().domain([0, max_hist])
        .range([ 0, hist_height]);
    let x = d3.scaleLinear().domain([0, histogram[0]['hist'].length])
        .range([0, hist_width]);

    let svg = d3.select('#summary_hist')
    	.attr('width', (hist_width + hist_margin.left + hist_margin.right) * attrs.length)
    let hist_span = (hist_width + hist_margin.left + hist_margin.right)

    let column = svg.selectAll(".col_hist").data(attrs)
        .enter().append("g")
        .attr("class", `col_hist`)
        .attr("id", (d, i) => `colhist-${i}`)
        .attr("transform", function(d, i) { 
            return `translate(${col_order[i] * hist_span + rectMarginH}, 
            ${yScale(0)})`; });

    column.append("text")
        .attr("x", 6)
        .attr("y", yScale.bandwidth() / 1.5 - 5)
        .attr("dy", ".32em")
        .attr("text-anchor", "start")
        .text((d) => {
            let textLength = ctx.measureText(d).width;
            let text = d;
            let txt = d;
            while (textLength > hist_width-20) {
                text = text.slice(0, -1);
                textLength = ctx.measureText(text+'...').width;
                txt = text+'...';
            }
            return txt;
        })
        .append('title')
        .text(d => d)

    let histEnter = svg.selectAll(".summary_hist")
        .data(histogram)
        .enter()
        .append('g')
        .attr('class', 'summary_hist')
        .attr('transform', (d,i) => 
            `translate(${col_order[i]*hist_span+rectMarginH}, ${yScale(0)+font_size*2})`);

    stepWidth = hist_width / 10;
//     histEnter.append('rect')
//         .style('width', hist_width)
//         .style('height', hist_height)
//         .style('fill', 'none')
//         .style('stroke', 'dimgrey')

//     histEnter.selectAll('.hist_rect')
//         .data(d=> d['hist'])
//         .enter()
//         .append('rect')
//         .attr('class', 'hist_rect')
//         .style('x', (d, i) => i * stepWidth)
//         .style('y', d => hist_height - y(d))
//         .style('width', stepWidth)
//         .style('height', d => y(d))
//         .style('fill', 'darkgrey');
//     histEnter.append('line')
//         .attr('x1', 0)
//         .attr('x2', rectWidth)
//         .attr('y1', hist_height)
//         .attr('y2', hist_height)
//         .style('stroke', 'darkgrey')
}


function update_histogram_curve(selected_hist) {
	let max_hist = d3.max(histogram, (d) => d3.max(d['hist']));

	let y = d3.scaleLinear().domain([0, max_hist])
		.range([hist_height-hist_margin.bottom ,hist_margin.top]);
	let x = d3.scaleLinear().domain([0, histogram[0]['hist'].length])
		.range([hist_margin.left, hist_width-hist_margin.right]);

	let line_function = d3.line()
		.x((d) => x(d.x))
		.y(d => y(d.y));

	d3.selectAll('.multi_selection').remove()

	selected_hist.forEach((d, i) => {
		g = d3.select(`#hist_group_${i}`);

		let values = [{x: 0, y: 0}];
		d['hist'].forEach((h, i) => values.push({x: i+1, y: h}));
		values.push({x: d['hist'].length, y:0});

		g.append('path')
			.attr('class', 'hist_line')
			.attr('d', line_function(values))
			.style('stroke', 'steelblue')
			.style('fill', 'steelblue')
			.style('fill-opacity', .9)
	})
}