let show_saved_node_mark = true;


function render_saved_summary() {
	d3.selectAll('#class_summary > g')
		.remove();
	d3.selectAll('#overlap_summary > g')
		.remove();

	update_saved_summary();
}

function update_saved_summary() {
	let coverage_svg = d3.select('#class_summary'),
		overlap_svg = d3.select('#overlap_summary'),
		link_width = 10,
		rectHeight = (glyphCellHeight+2) * target_names.length,
		coverage_height = target_names.length * rectMarginH + rectHeight,
		overlap_height = (rectMarginH + rectHeight) * Object.keys(saved_rules).length;

	// reset width scale
	let widthScale = d3.scaleLinear()
        .domain([0, tot_train])
		.range([0, 200]),
		rlinkScale = d3.scaleLinear()
			.domain([filter_threshold['support'], tot_train])
			.range([1, glyphCellHeight]);
		opacityScale = d3.scaleLinear()
			.domain([0, tot_train])
			.range([0,1])

	// process covereage union and intersection
	let [class_cover, overlapping] = process_coverage(); 

	// overall coverage
	d3.select('#class_summary_div')
		 .style('height', `${coverage_height}px`);

	let coverage_g = coverage_svg
		.attr('height', coverage_height)
		.append('g')
		.attr("id", "summary_coverage")
		.attr('height', coverage_height)
		.attr("transform", 	`translate(${link_width}, 0)`);

	let coverage_dict = [];

	target_names.forEach((d, i) => {
		coverage_dict.push({
			"width": widthScale(d3.sum(lattice[0]['conf_mat'][i])),
			"fill": colorCate[i],
			"opacity": .5,
			"y": i * (rectMarginH+glyphCellHeight),
		});
		coverage_dict.push({
			"width": widthScale(class_cover[i]),
			"fill": colorCate[i],
			"opacity": 1,
			"y": i * (rectMarginH+glyphCellHeight),
		});
	});

	// rule set coverage
	coverage_g.selectAll(".summary_rect")
		.data(coverage_dict)
		.enter()
		.append('rect')
		.attr('class', 'summary_rect')
		.attr("x", 0)
		.attr("y", d => d.y)
		.attr("width", d => d.width)
		.attr("height", glyphCellHeight)
		.attr("fill", d => d.fill)
		.attr("fill-opacity", d => d.opacity);

	coverage_g.selectAll(".summary_text")
		.data(target_names)
		.enter()
		.append('text')
		.attr('class', 'summary_text')
		.attr('x', 200)
		.attr('y', (d,i) => coverage_dict[i*2].y+glyphCellHeight)
		.text((d,i) => {
			return `${class_cover[i]}/${d3.sum(lattice[0]['conf_mat'][i])}`
		})

	// overlapping
	let overlapping_g = overlap_svg
		.attr("height", overlap_height);

	d3.select('#overlap_summary_div')
		.style("height", `${overlap_height}px`);

	// rule coverage
	let rule_cover = [];
	for (let i = 0; i<saved_rules_idx2id.length; i++) {
		let nid = saved_rules_idx2id[i],
			rule_bar_info = [];

		target_names.forEach((d, ci) => {
			rule_bar_info.push({
				'id': i,
				'class': ci,
				'width': widthScale(d3.sum(lattice[nid]['conf_mat'][ci])),
			});
		});
		rule_cover.push(rule_bar_info);
	}

	let rule_g = overlap_svg.selectAll(".rule_summary")
		.data(rule_cover).enter()
		.append('g')
		.attr('class', 'rule_summary')
		.attr('transform', (d, i) => `translate(${link_width}, ${(rectHeight + rectMarginH) * i+2})`);

	let rule_rect = rule_g
		.append('g')
		.attr('id', (d, i) => `rule_cover-${i}`)
		.attr('class', 'rule_cover_bar')
		
	rule_rect.selectAll('.single_rule')
		.data(d => d).enter()
		.append('rect')
		.attr('class', 'single_rule')
		.attr('x', 0)
		.attr('y', (d, i) => i * (1+glyphCellHeight))
		.attr('width', d => d.width)
		.attr('height', glyphCellHeight)
		.attr('fill', (d, i) => colorCate[i])
		.attr('stroke', (d, i) => colorCate[i]);

	rule_rect.selectAll('.overlap_rect')
		.data(d => d).enter()
		.append('rect')
		.attr('id', (d, i)=> `overlap-${d.id}-${d.class}`)
		.attr('class', 'overlap_rect')
		.attr('x', 0)
		.attr('y', (d, i) => i * (1+glyphCellHeight))
		.attr('width', 0)
		.attr('height', glyphCellHeight)
		.style('stroke', 'none')
		.style('fill', "white");

	rule_mask = rule_g.append('rect')
		.attr('x', 0)
		.attr('class', 'rule_mask_overlap')
		.attr('id', (d, i)=> `rule_mask_overlap-${i}`)
		.attr('height', d => d.length * glyphCellHeight + rectHeight)
		.attr('width', 200);

	rule_g.append("text")
		.attr('id', (d, i) => `compare_rule-${i}`)
		.attr('x', 200)
		.attr('dy', rectHeight)
		.text((d, i) => `rule ${i+1}`);

	rule_g.append("text")
		.attr('id', (d, i) => `=_rule-${i}`)
		.attr('x', 250)
		.attr('dy', rectHeight)
		.attr("text-decoration", "underline")
		.text('remove')
		.on('click', function() {
			let id = +this.id.split('-')[1];
			rule_remove(saved_rules_idx2id[id]);
		})

	rule_mask.on('mouseover', function() {
		let id = +this.id.split('-')[1];

		// fill the other rules
		for (let i = 0; i<saved_rules_idx2id.length; i++) {
			if (i == id) continue;
			target_names.forEach((d, ci) => {
				let overlapped = id < i ? widthScale(overlapping[id][i][ci]) : widthScale(overlapping[i][id][ci]);
				d3.select(`#overlap-${i}-${ci}`)
					.attr('x', overlapped)
					.attr('width', rule_cover[i][ci].width - overlapped);
			})
		}

		d3.select(`#compare_rule-${id}`)
			.style('font-weight', 'bold');

		// highlight in the rule representation
		node_hover(saved_rules_idx2id[id]);

	}).on("mouseout", function() {
		let id = +this.id.split('-')[1];
		d3.selectAll('.overlap_rect')
			.attr('width', 0);

		d3.select(`#compare_rule-${id}`)
			.style('font-weight', 'normal');

		node_unhover(saved_rules_idx2id[id]);
	});
}

function process_coverage() {
	// get overall coverage
	let union = [];
	// for (let i = 0; i < Object.keys(saved_rules).length; i++) {
	// 	if (Object.keys(saved_rules)[i] == 'max_idx') continue;
	// 	union = [...new Set([...union, ...lattice[saved_rules[i]['lattice_node_id']]['matched_data']])];
	// }
	Object.keys(saved_rules).forEach((nid) => {
		if (nid == 'max_idx') return;
		union = [...new Set([...union, ...lattice[nid]['matched_data']])];
	})

	// get coverage by class
	let class_cover = new Array(target_names.length).fill(0);
	union.forEach((idx) => {
		class_cover[y_pred[idx]]++;
	})

	// get overlapping
	let overlapping = {};
	for (let i = 0; i < saved_rules_idx2id.length; i++) {
		let subgroup1 = lattice[saved_rules_idx2id[i]]['matched_data'];
		
		for (let j = i+1; j < saved_rules_idx2id.length; j++) {
            let subgroup2 = lattice[saved_rules_idx2id[j]]['matched_data'],
            	overlapped = subgroup1.filter(value => subgroup2.includes(value));
            // only save the overlap[i][j] where i < j
            if (!(i in overlapping)) {
            	overlapping[i] = {};
            }

            overlapping[i][j] = new Array(target_names.length).fill(0);
            overlapped.forEach((idx) => {
            	overlapping[i][j][y_pred[idx]]++;
            });
        }
	}

	return [class_cover, overlapping]
}