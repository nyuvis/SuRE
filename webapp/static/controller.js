let ori_order = [];
let col_order = [], row_order = [];

let phrased_rule_id = -1;
let NODE_ENCODING = "purity";
let SUMMARY_LAYOUT = "tree";
let X_POS = 'fidelity';

d3.select("#node_encoding")
	.on("change", function() {
		let val = d3.select(this).property('value');
		change_node_encoding(val);
	});

d3.select("#layout")
	.on("change", function() {
		let val = d3.select(this).property('value');
		change_layout(val);
	});

d3.select("#generate_rule")
	.on("click", function() {
		generate_rules();
	});

d3.select('#x_position')
	.on('change', function() {
		let val = d3.select(this).property('value');
		change_x_position(val);
	});

d3.select('#dataset')
	.on('change', function() {
		let val = d3.select(this).property('value');
		folder = val;
		param_set = false;
		d3.select("#progress")
			.style('display', 'block');
		loadData();
	})

d3.select('#rule_encoding')
	.on('change', function() {
		let val = d3.select(this).property('value');
		if (val !== 'color') {
			d3.select('#color_scale')
			    .attr('visibility', "hidden")
		} else {
			d3.select('#color_scale')
			    .attr('visibility', "visible")
		}

		if (val == 'bar'){
			BAR = true;
			MOSAIC = false;
		} else if (val == 'mosaic') {
			BAR = false;
			MOSAIC = true;
		} else {
			BAR = false;
			MOSAIC = false;
		}

		update_rule_rendering(rule_svg, col_svg, stat_svg, "", listData, row_order);
	})

function generate_rules() {
	let support_val, num_feat_val;
	d3.select('#support_val')
        .attr('value', function() {
            support_val = this.value;
            filter_threshold['support'] = support_val;
            return this.value;
        });

    d3.select('#fidelity_val')
    	.attr('value', function() {
            fidelity= this.value;
            filter_threshold['fidelity'] = fidelity;
            return this.value;
        });

    d3.select('#feature_val')
        .attr('value', function() {
            num_feat_val = this.value;
            filter_threshold['num_feat'] = num_feat_val;
            return this.value;
        });

    d3.select('#feature_bin')
    	.attr('value', function() {
            num_feat_bin= this.value;
            filter_threshold['num_bin'] = num_feat_bin;
            return this.value;
        });

    support_val = parseFloat(support_val);
	filter_threshold['support'] = support_val;

	num_feat_val = parseFloat(num_feat_val);
	filter_threshold['num_feat'] = num_feat_val;

	d3.select("#myModel")
		.style("display", "none");
	
	loadData();

	d3.select("#progress")
		.style("display", "block");
}

function click_setting() {
	// console.log("click")
	document.getElementById('support_val').value = filter_threshold['support'];

	d3.select("#myModel")
		.style("display", "block");
}

function click_cancel() {
	d3.select("#myModel")
		.style("display", "none");
}

function click_summary_node(node_id, add_to_selection) {
	console.log('click node', node_id)
	// highlight in the tree view
	d3.select(`#tree_node-${node_id} .highlight-circle`).remove();
	d3.select(`.rule_clicked_node`).remove();
	d3.selectAll('.link').style('stroke-width', 1)

	// get the linked node information
	let linked_node_ids = find_connection(node_id);
	linked_node_ids.sort((a,b) => a-b);

	// reset sorting
	row_sorted = [false, false, false, false];
	d3.selectAll('.mask')
		.classed('highlight-stat', false)
		.classed('unselected-stat', true);

	postData("find_node_rules", linked_node_ids, (node_rules)=>{
		let rules = node_rules['rule_lists'];
		present_rules = rules;
		col_order = column_order_by_feat_freq(rules);

		// update linked node2rule pos
		node2rule[1] = {};
		rule2node[1] = {};
		rules.forEach((d, i) => {
			node2rule[1][d['node_id']] = i;
			rule2node[1][i] = d['node_id'];
		});
		
		// update_column_rendering(col_svg2);
		update_rule_rendering(rule_svg2, col_svg2, stat_svg2, 2, rules, col_order);

		if (add_to_selection) {
	    	// add one selected rule to multiple selection
			if (node_id in multiple_selection) {
				delete multiple_selection[node_id];
			} else {
				multiple_selection[node_id] = rules[rules.length-1];
			}

			// re-render node highlight
			// highlight selected nodes
			d3.select(`#tree_node-${node_id} .highlight-circle`).remove();
			if (node_id in multiple_selection) {
				let node = d3.select(`#tree_node-${node_id}`)
				let size = summary_size_(node_info[node_id]['support'])
				node.append('rect')
					.attr('class', 'highlight-circle')
					.attr('x', -size/2)
					.attr('y', -size/2)
					.attr('width', size)
					.attr('height', size);
			}

			let multiple_rules = [], candiate_rules = [];
			
			// keep only the ancestor node for multiple nodes on the same path
			Object.keys(multiple_selection).forEach((node_id, idx) => {
				candiate_rules.push(multiple_selection[node_id]);
			});
			candiate_rules.sort((a,b) => pre_order[a.node_id].order-pre_order[b.node_id].order);
			let idx = 0;
			while (idx < candiate_rules.length) {
				let node_id = candiate_rules[idx].node_id;
				multiple_rules.push(candiate_rules[idx]);
				idx++;
				while (idx < candiate_rules.length 
					&& pre_order[node_id].order < pre_order[candiate_rules[idx].node_id].order 
					&& pre_order[candiate_rules[idx].node_id].order <= pre_order[node_id].max_descendant) {
					idx++;
				}
			}

			node2rule[3] = {};
			rule2node[3] = {}

			// multiple_rules.sort((a,b) => pre_order[a.node_id].order-pre_order[b.node_id].order);

			let summary_info = {
				'support': 0,
				'tp': 0, 'fp': 0, 'tn': 0, 'fn': 0,
				'r-squared': [0, 0]
			}
			multiple_rules.forEach((rule, idx) => {
				let node_id = rule['node_id'];
				summary_info['support'] += d3.sum(node_info[node_id]['value'])
				summary_info['tp'] += Math.floor(node_info[node_id]['conf_mat'][0][0] * d3.sum(node_info[node_id]['value']))
				summary_info['fp'] += Math.floor(node_info[node_id]['conf_mat'][0][1] * d3.sum(node_info[node_id]['value']))
				summary_info['tn'] += Math.floor(node_info[node_id]['conf_mat'][1][1] * d3.sum(node_info[node_id]['value']))
				summary_info['fn'] += Math.floor(node_info[node_id]['conf_mat'][1][0] * d3.sum(node_info[node_id]['value']))
				// summary_info['r-squared'][0] += summary_info['tp'] + summary_info['tn'];
				// summary_info['r-squared'][1] += 
			});
    		render_stat_summary(summary_info);


			tab_rules[3] = multiple_rules;

			multiple_rules.forEach((rule, idx)=>{
				let node_id = rule['node_id'];
				node2rule[3][node_id] = idx;
				rule2node[3][idx] = node_id;
			});

			// update overview
			// the subtree nodes have pre-order larger than the clicked nodes, but 
			let overview_rules = listData.slice();
			node2rule[0] = {};
			rule2node[0] = {};
			overview_rules.sort((a, b) => pre_order[a.node_id].order - pre_order[b.node_id].order);
			let replace_subtree = 0;
			let new_rules = [];
			overview_rules.forEach((rule) => {
				if (replace_subtree < multiple_rules.length && pre_order[rule.node_id].order > pre_order[multiple_rules[replace_subtree].node_id].max_descendant) {
					new_rules.push(multiple_rules[replace_subtree]);
					replace_subtree++;
				}

				// subtree of the node:replace_subtree
				if (replace_subtree < multiple_rules.length
					&& pre_order[multiple_rules[replace_subtree].node_id].order < pre_order[rule.node_id].order
					&& pre_order[multiple_rules[replace_subtree].node_id].max_descendant >= pre_order[rule.node_id].order) 
				{
					// skip the leaf nodes here
		
				} else {
					new_rules.push(rule);
				}
			});
			if (replace_subtree < multiple_rules.length && 
				pre_order[overview_rules[overview_rules.length-1].node_id].order <= pre_order[multiple_rules[replace_subtree].node_id].max_descendant) {
				new_rules.push(multiple_rules[replace_subtree]);
			}
			tab_rules[0] = new_rules;
			new_rules.forEach((rule, idx)=>{
				let node_id = rule['node_id'];
				node2rule[0][node_id] = idx;
				rule2node[0][idx] = node_id;
			});
    		col_order = column_order_by_feat_freq(multiple_rules);
			update_rule_rendering(rule_svg, col_svg, stat_svg, "", new_rules, col_order);
			update_rule_rendering(rule_svg4, col_svg4, stat_svg4, 4, multiple_rules, col_order);

		}

		// highlight in the rule view TODO: DEBUG 
		if (node_id in node2rule[0]) {      
			highlight_in_tab(0, '', node_id);
		}
		for (let tab_id = 1; tab_id < 4; tab_id++) {
			if (node_id in node2rule[tab_id]) {
				highlight_in_tab(tab_id, tab_id+1, node_id);
			}	
		}
		if (clicked_summary_node_id == node_id) {
			clicked_summary_node_id = -1;
		} else {
			clicked_summary_node_id = node_id;
		}
	})
}

function highlight_in_tab(tab_id, tab_p, node_id) {
	let rule_idx = node2rule[tab_id][node_id];
	d3.select(`#rule_svg${tab_p}`).select(`#back-rect-${rule_idx}`)
            .classed('rule_highlight', false);

	if (clicked_summary_node_id != node_id) {
		d3.select(`#rule_svg${tab_p}`).select(`#back-rect-${rule_idx}`)
		  .classed('rule_highlight', true);

		document.getElementById(`stat_div${tab_p}`).scrollTop = yScale(rule_idx);
		document.getElementById(`rule_div${tab_p}`).scrollTop = yScale(rule_idx);
	}
}

function click_rule(clicked_g, rule_idx, rule, tab_p) {
	console.log("click on rule", rule_idx);
	// highlight the rule in the rule view
	rule_svg.selectAll('.rule_highlight')
		.classed('rule_highlight', false);
	rule_svg2.selectAll('.rule_highlight')
		.classed('rule_highlight', false);
	rule_svg3.selectAll('.rule_highlight')
		.classed('rule_highlight', false);
	rule_svg4.selectAll('.rule_highlight')
		.classed('rule_highlight', false);

	clicked_g.select('.back-rect')
		.classed('rule_highlight', true);


	let tab_id;
	if (tab_p == '') {
		tab_id = 0;
	} else {
		tab_id = +tab_p - 1;
	}
	// dblclick(id2hierarchy[rule2node[tab_id][rule_idx]]);
	selected_rule = rule_idx;
	get_compare_data(listData[rule_idx]['rid']);
	render_data(rule_idx);
}


let same_set_stat=[], similar_set_stat=[];

function get_compare_data(selected_rule) {
	// find similiar rules 
	let url = "get_compare_data/" + selected_rule
	postData(url, {}, (data) => {
		let top_simi = data['top_simi'];
		same_set_stat = data['same_set_stat'];
		similar_set_stat = data['similar_set_stat'];
		tab_rules[3] = top_simi;

		// render the comparsion stat for svg 1
		render_comparison_bar(comp_svg, "", row_order, same_set_stat)

		// render compareison stat for similar svg
		// render_comparison_bar(comp_svg4, 4, row_order, similar_set_stat)

		// render rules for similar rules
		update_rule_rendering(rule_svg4, col_svg4, stat_svg4, 4, top_simi, col_order);
	})
}

function render_data(rule_idx, rule) {
	// get rule content
	let rules = listData[rule_idx];
	if (rule) {
		rules = rule;
	}
	// update data table
	let url = "get_matched_data"
	postData(url, JSON.stringify({"rules": rules['rules']}), (data) => {
		render_feature_names_and_grid('', '', d3.select("#column_svg5"), '', 5, col_order);
		d3.select("#data-table tbody").remove();

		let matched_data = data['matched_data'];
		let matched_gt = data['matched_gt'];
		let matched_pred = data['matched_pred'];

		d3.selectAll('#data-table *').remove();
		
		let table_width = attrs.length* (glyphCellWidth * 5 + rectMarginH * 2 - 2) + 5;
		let rows = d3.select('#data-table').append('table')
			.style('width', `${table_width}px`)
			.style('padding-left', `${margin.left}px`)
			.style('padding-right', `${margin.right}px`)
			.append('tbody')
			.selectAll('tr')
			.data(matched_data)
			.enter()
			.append('tr');

		let cells = rows.selectAll('td')
			.data(row => {
				let ordered_row = new Array(row.length);
				for (let i = 0; i<row.length; i++) {
					ordered_row[col_order[i]] = row[i];
				}
				return ordered_row;
			})
			.enter()
			.append('td')
			.text(cell => cell);

		// add prediction
		d3.selectAll('#data-pred svg *').remove();

		d3.select('#data-pred svg')
			.attr('width', "25px")
			.attr('height', 18*matched_gt.length)
			.append('g')
			.attr('class', 'instance-conf')
			.selectAll('circle')
			.data(matched_pred)
			.enter()
			.append('circle')
			.attr("cx", xScale.bandwidth()/2)
	        .attr("cy", (d, idx) => {
	            return 18 * idx + rule_radius + 2;
	        })
	        .attr("r", rule_radius)
	        .attr("fill", (d, idx) => {
	        	if (d == matched_gt[idx]) {
	        		return colorCate[d];
	        	} else {
	        		if (d == 0)
	        			return "url(#fp_pattern)"
	        		else 
	        			return "url(#fn_pattern)"
	        	}
	        })
	})
}

function hover_rule(clicked_g, rule_idx, rule, tab_p) {
	console.log('hover on rule row-'+rule_idx);

	let tab_id;
	if (tab_p == '') {
		tab_id = 0;
	} else {
		tab_id = +tab_p - 1;
	}

	// highlight the rule in the rule view
	clicked_g.select('.back-rect')
		.classed('rule_hover', true);
	// highlight in the stat
	d3.select(`#stat${tab_p}-back-rect-${rule_idx}`)
		.classed('rule_hover', true);
	// highlight in the compare
	d3.select(`#comp${tab_p}-back-rect-${rule_idx}`)
		.classed('rule_hover', true);

	// highlight the node in the tree view
	// let node_id = rule2node[tab_id][rule_idx];
	// d3.select(`.rule_clicked_node`).remove();

	// d3.select(`#tree_node-${node_id}`)
	// 	.append('circle')
	// 	.attr('class', 'rule_clicked_node')
	// 	.attr('r', summary_size(node_info[node_id]['support']))
	// let node = d3.select(`#tree_node-${node_id}`)

	// if (NODE_ENCODING == 'purity') {
	// 	let size = summary_size_(node_info[node_id]['support'])
	// 	node.append('rect')
	// 		.attr('class', 'rule_clicked_node')
	// 		.attr('x', -size/2)
	// 		.attr('y', -size/2)
	// 		.attr('width', size)
	// 		.attr('height', size);
	// } else {
	// 	node.append('circle')
	// 		.attr('class', 'rule_clicked_node')
	// 		.attr('r', summary_size(node_info[node_id]['support']));
	// }

	// update rule description
	let rule_des = d3.select('#rule_description');
	rule_des.selectAll('p').remove();

	let rules = listData[rule_idx];
	if (rule) {
		rules = rule;
	}
	let str = "";

	let rule_to_show = Array.from(rules['rules']);
	rule_to_show.sort((a, b) => col_order[a['feature']] - col_order[b['feature']]);
	rule_to_show.forEach((d, i) => {
		if (i>0) {
			str += "<b>AND</b> "
		} else {
			str += "<b>IF</b> "
		}
		str += `<u>${attrs[d['feature']]}</u>`;
		if (d['sign'] !== 'range') {
			str += " " + d['sign'];
			if (d['sign'] == '>') str += '=';
			str += d['threshold'] + " "
		} else {
			// str += " btw. (" + d['threshold0'] + ', ' + d['threshold1'] + '] '
			// let threshold0 = real_percentile['percentile_table'][Math.ceil(d['threshold0'])][d['feature']],
			// 	threshold1 = real_percentile['percentile_table'][Math.floor(d['threshold1'])][d['feature']]

			str += " from " + d['threshold0'] + " to " + d['threshold1'] + " ";
		}
	})

	str += "<b>THEN</b> " + `<span style="color: ${colorCate[rules['label']]}">` + target_names[rules['label']] + "</span>.";
	// let node_id = rule['node_id'], 
	// 	tot_support = d3.sum(node_info[0]['value']),
	// 	node_support = node_info[node_id]['support'] * tot_support;
	// str += `<br> tp: ${Math.floor(node_info[node_id]['conf_mat'][0][0] * d3.sum(node_info[node_id]['value']))}, `
	// str += `fp: ${Math.floor(node_info[node_id]['conf_mat'][0][1] * node_support)}, `
	// str += `tn: ${Math.floor(node_info[node_id]['conf_mat'][1][1] * node_support)}, `
	// str += `fn: ${Math.floor(node_info[node_id]['conf_mat'][1][0] * node_support)}.`

	rule_des.append('p')
		.html(str);

	// graph
    if (tab_p == '') {
        let source = listData[rule_idx]['rid'];
        d3.select(`#node-${source}`)
            .style('stroke', 'gray')
            .style('stroke-width', '1.5px');
        graph_nodes.forEach(node => {
            if (node['id']===source || graph_link_dict[source].indexOf(node['id'])>=0 ) {
                return;
            }
            d3.select(`#node-${node['id']}`)
                .style('fill', '#999')
                .style('fill-opacity', .2)
        })

        graph_link_dict[source].forEach(target => {
            d3.select(`#link-${source}-${target}`)
                .style('stroke-opacity', '0.9');
        });
    }
}

function showRule(evt, id) {
  // Declare all variables
  var i, tabcontent, tablinks;

  // Get all elements with class="tabcontent" and hide them
  tabcontent = document.getElementById("rule-detail").getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  // Get all elements with class="tablinks" and remove the class "active"
  tablinks = document.getElementById("rule-detail").getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }

  // Show the current tab, and add an "active" class to the button that opened the tab
  document.getElementById(id).style.display = "flex";
  evt.currentTarget.className += " active";
}

function change_node_encoding(val) {
	NODE_ENCODING = val;

	update_summary(new_nodes);	
	update_legend();
}

function change_layout(val) {
	SUMMARY_LAYOUT = val;

	if (SUMMARY_LAYOUT == 'tree') {
		d3.select('#x-setting').style('display', 'none');
	} else {
		d3.select('#x-setting').style('display', 'flex');
	}

	update_summary(new_nodes);
}

function change_x_position(val) {
	X_POS = val;

	if (X_POS == 'accuracy') {
		summary_x = d3.scaleLinear()
			.domain([filter_threshold['accuracy'][0], filter_threshold['accuracy'][1]])
			.range([view_margin.left, view_margin.left+view_width]);	
	} else if (X_POS == 'fidelity') {
		summary_x = d3.scaleLinear()
			.domain([filter_threshold['fidelity'], 1])
			.range([view_margin.left, view_margin.left+view_width]);
	}

	update_summary(new_nodes);
}

function click_tree_level(idx) {
	d3.select(`#depth-${clicked_tree_level}`)
		.style("stroke-width", .5);

	d3.select(`#depth-${idx}`)
		.style("stroke-width", 1.5);
	clicked_tree_level = idx;

	// update the rule view for selected level
	fetch(domain + "get_rules_by_level/" + idx)
	.then((data) => {
      if(data.status !== 200 || !data.ok) {
        throw new Error(`server returned ${data.status}${data.ok ? " ok" : ""}`);
      }
      const ct = data.headers.get("content-type");
      return data.json();
    }).then((res) => {
		let rules = res['rule_lists'];
		let nodes = res['nodes'];
	    present_rules = rules;
	    col_order = column_order_by_feat_freq(rules);

	    // update linked node2rule pos
	    node2rule[2] = {};
	    rule2node[2] = {};
	    rules.forEach((d, idx) => {
	      node2rule[3][d['node_id']] = idx;
	      rule2node[3][idx] = d['node_id'];
	    })
		update_rule_rendering(rule_svg3, col_svg3, stat_svg3, 3, rules, col_order);
	})
}

function click_setting_tab(evt, id) {
	// Declare all variables
	var i, tabcontent, tablinks;

	// Get all elements with class="tabcontent" and hide them
	tabcontent = document.getElementById("setting-block").getElementsByClassName("tabcontent");
	for (i = 0; i < tabcontent.length; i++) {
		tabcontent[i].style.display = "none";
	}

	// Get all elements with class="tablinks" and remove the class "active"
	tablinks = document.getElementById("setting-tabs").getElementsByClassName("tablinks");
	for (i = 0; i < tablinks.length; i++) {
		tablinks[i].className = tablinks[i].className.replace(" active", "");
	}

	// Show the current tab, and add an "active" class to the button that opened the tab
	document.getElementById(id).style.display = "flex";
	evt.currentTarget.className += " active";
}

d3.select('body').on("keydown", function() {
    if (document.getElementById('myModel').style.display == 'block') {
    	if (d3.event.key === "Escape") { // escape key maps to keycode `27`
        	click_cancel();
        } else if (d3.event.key === 'Enter') {
        	generate_rules();
        }
    }
});

