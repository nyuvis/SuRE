let tree,
	root1,
	tree_hierarchy,
	id2hierarchy = {};

let multiple_selection = {};
let timeout = null;

// Creates a curved (diagonal) path from parent to the child nodes
function diagonal(s, d) {

	path = `M ${s.x} ${s.y}
        C ${(s.x + d.x) / 2} ${s.y},
          ${(s.x + d.x) / 2} ${d.y},
          ${d.x} ${d.y}`

	return path
}

function generate_tree(treeData) {
	d3.selectAll('#summary_view > *:not(.depth-line)').remove();

	d3.select('#summary_view')
		.append('g')
		.attr('id', 'tree_structure')
		.attr('transform', `translate(${view_margin.left}, ${view_margin.top})`);

	root1 = d3.hierarchy(treeData, function(d) { return d.children; });
	root1.x0 = tree_height / 2;
	root1.y0 = 0;

	// Compute the new tree layout.
	tree_hierarchy = tree(root1);

	// initialize id2hierarchy
	tree_hierarchy.descendants().forEach((vo) => {
		id2hierarchy[vo['data']['node_id']] = vo;
	})

	update_tree();
}

function update_tree() {
	let view = d3.select('#tree_structure');

	view.selectAll('*').remove();

	let nodes = tree_hierarchy.descendants(),
    	links = tree_hierarchy.descendants().slice(1);

	// Normalize for fixed-depth.
	nodes.forEach(function(d) { d.y = d.depth * (depth_height) });

	// Update the nodes…
	var node = view.selectAll("g.node")
	  .data(nodes, function(d) { 
	  	return d.id || (d.id = ++i); 
	  });

	// // Enter any new nodes at the parent's previous position.
	var nodeEnter = node.enter().append("g")
	  .attr("class", "node")
	  .attr("transform", (d, i) => { 
	  	return "translate(" + d.x + "," + d.y + ")"; 
	  })
	  .attr('id', d => `tree_node-${d['data']['node_id']}`)

	// Transition nodes to their new position.
	var nodeUpdate = nodeEnter.merge(node);

	// render tree nodes in rectangles
	let conf_fill = [ '#4f7d8c', colorCate[0], `#995a57`,colorCate[1],]

	tree_nodes = nodeUpdate.append('g')
		.attr('visibility', (d) => {
			if (!new_node_shown[d['data']['node_id']]) {
				return "hidden";
			} else return "visible";
		});

	tree_nodes.selectAll('rect')
		.data(node => {
			let size = summary_size_(node['data']['support']);
			let v0 = d3.sum(node.data.conf_mat[0]), 
				v1 = d3.sum(node.data.conf_mat[1]);
			conf_mat = [
				{'name': 'fp', 'id':node['data']['node_id'],
					'x': -size/2, 'width': size*v0,
					'y': -size/2, 
					'height': v0 > 0 ? size*node.data.conf_mat[0][1]/v0 : 0,
				},
				{'name': 'tp', 'id':node['data']['node_id'],
					'x': -size/2, 'width': size*v0,
					'y': v0 > 0 ? -size/2+size*node.data.conf_mat[0][1]/v0 : 0, 
					'height': v0 > 0 ? size*node.data.conf_mat[0][0]/v0 : 0,
				},
				{'name': 'fn', 'id':node['data']['node_id'],
					'x': -size/2+size*d3.sum(node.data.conf_mat[0]), 'width': size*v1,
					'y': -size/2, 
					'height': v1 > 0 ? size*node.data.conf_mat[1][0]/v1 : 0,
				},
				{'name': 'tn', 'id':node['data']['node_id'],
					'x': -size/2+size*d3.sum(node.data.conf_mat[0]), 'width': size*v1,
					'y': v1 > 0 ? -size/2+size*node.data.conf_mat[1][0]/v1: 0, 
					'height': v1 > 0 ? size*node.data.conf_mat[1][1]/v1 : 0,
				},
			];
			return conf_mat;
		})
		.enter()
		.append('rect')
		.attr('x', d => d.x)
		.attr('y', d => d.y)
		.attr('width', d=> d.width)
		.attr('height', d=> d.height)
		.style('fill', (d, i) => conf_fill[i])
		.style('stroke', 'none')
		// .style('stroke-width', '.5')


	// add feature names to nodes
	let feature_name = nodeUpdate.append("text")
	  .attr('id', (node)=>`feat_name_${node['data']['node_id']}`)
	  .attr('class', 'node_feature_name')
	  .style("visibility", "hidden");

	feature_name.append("tspan")
		.attr("x", function(d) { return d.children || d._children ? 5 : 13; })
		.text(function(node) { 
			let d = node['data'];
			if (d.feature >= 0) {
				return attrs[d.feature];
			}
		});

	// Update the links…

	var link = view.selectAll("path.link")
	  .data(links, function(d) { 
	  	return d.id; 
	  });

	// Enter any new links at the parent's previous position.
	let linkEnter = link.enter().insert("path", "g")
	  .attr("class", "link")
	  .attr("id", d => `tree_link_${d['data']['node_id']}_${d['data']['parent']}`)
	  .style('fill', 'none')
	  .style('stroke', 'lightgrey')
	  .style("stroke-width", d => {
	  	return 1;
	  	// return linkWidthScale(d.target.value[0]+d.target.value[1])
	  });


	let linkUpdate = linkEnter.merge(link);

	// Transition back to the parent element position
	linkUpdate.attr('d', function(d){ 
	    if (!new_node_shown[d['data']['node_id']]) return "";
      	 else return diagonal(d, d.parent) 
      });

	// Transition exiting nodes to the parent's new position.
	let linkExit = link.exit().remove();

	// Update the link text
    var linktext = view.selectAll("g.link-text")
        .data(links, function (d) {
	        return d.id;
		}).enter()
	    .insert("g")
	    .attr("class", "link-text")
	  	.attr("id", d => `link_text_${d['data']['node_id']}_${d['data']['parent']}`)
		.style('visibility', 'hidden');

	// add background for the link text
	linktext.append('rect')
		.attr('class', 'link_text_back');

    linktext.append("text")
		.attr("fill", "Black")
		.style("font", "normal 12px " + font_family)
		.attr("dy", ".35em")
		.attr("class", "sign_threshold")
		.text(function (d) {
			let cate_threshold = d.parent['data'].threshold,
				parent = d.parent['data'],
				real_threshold;
			if (cate_threshold == 0.5) {
				real_threshold = real_percentile['percentile_table'][0][parent['feature']];
				if (!Number.isInteger(real_threshold)) {
					real_threshold = real_threshold.toFixed(1)
				}
			} else if (cate_threshold == 1.5){
				real_threshold = real_percentile['percentile_table'][1][parent['feature']];
				if (!Number.isInteger(real_threshold)) {
					real_threshold = real_threshold.toFixed(1)
				}
			} else {
				real_threshold = 'error:' + cate_threshold;
			}
			return d.data.sign + real_threshold;
		})

	var textUpdate = linktext
	  .attr("transform", (d) => `translate(${((d.x + d.parent.x)/2)}, ${(d.y + d.parent.y)/2})`);

	textUpdate.select("text")
	  .style("fill-opacity", 1);

	// Transition exiting nodes to the parent's new position.
	var textExit = linktext.exit().remove();

	// link mask for link hovering
	let link_mask = link.enter().append("path", "g")
	  .attr("class", "link_mask")
	  .attr('d', function(d){ 
	    if (!new_node_shown[d['data']['node_id']]) return "";
      	 else return diagonal(d, d.parent) 
      })
      .style("stroke-width", 3)
      .style("stroke", "white")

    link_mask.on('mouseover', function(node) {
    	let d = node['data']
		d3.select(`#tree_link_${d['node_id']}_${d['parent']}`)
			.style('stroke', 'steelblue');
		d3.select(`#feat_name_${d['parent']}`)
			.style('visibility', 'visible');
		d3.select(`#link_text_${d['node_id']}_${d['parent']}`)
			.style('visibility', 'visible');

		let attr = attrs[node_info[d['parent']]['feature']], sign = d['sign'], 
			thred = node_info[d['parent']]['threshold']
		d3.select('#node_description')
			.html(`<p> Condition: ${attr+sign+thred} </p>`)
	})
	.on('mouseout', function(node) {
    	let d = node['data']
		d3.select(`#tree_link_${d['node_id']}_${d['parent']}`)
			.style('stroke', 'lightgrey');
		d3.select('#node_description p').remove();
		d3.selectAll('.node_feature_name')
			.style('visibility', 'hidden');
		d3.selectAll('.link-text')
			.style('visibility', "hidden");
	})

	// highlight selected nodes
	Object.keys(multiple_selection).forEach(node_id => {
		let node = d3.select(`#tree_node-${node_id}`)
		let size = summary_size_(node_info[node_id]['support'])
		node.append('rect')
			.attr('class', 'highlight-circle')
			.attr('x', -size/2)
			.attr('y', -size/2)
			.attr('width', size)
			.attr('height', size);
	});

	// make a mask for click/mouseover area 
	let node_mask = view.selectAll("g.node_mask")
	  .data(nodes, function(d) { 
	  	return d.id || (d.id = ++i); 
	  }).enter()
	  .append("g")
	  .attr("class", "node_mask")
	  .attr("transform", (d, i) => { 
	  	return "translate(" + d.x + "," + d.y + ")"; 
	  })

	node_mask.append('rect')
		.attr('class', 'node_mask')
		.attr('x', d => -summary_size_(d['data']['support'])/2)
		.attr('y', d => -summary_size_(d['data']['support'])/2)
		.attr('width', d => summary_size_(d['data']['support']))
		.attr('height', d => summary_size_(d['data']['support']))
		.attr('visibility', (d) => {
			if (!new_node_shown[d['data']['node_id']]) {
				return "hidden";
			} else return "visible";
		})

	node_mask.on('dblclick', d => {
		clearTimeout(timeout);
		console.log("node was double clicked", new Date());

		dblclick(d);
	// }).on('click', d => {
		// clearTimeout(timeout);

		// timeout = setTimeout(function() {
		// 	console.log("node was single clicked", new Date());
		// 	click_node(d['data']['node_id']);
		// }, 300)
	}).on('mouseover', function(node) {
		let d = node['data'];
		d3.select(`#feat_name_${d['node_id']}`)
			.style('visibility', 'visible');

		// show the link conditions of left/right children
		if (new_node_shown[d['left']]) {
			d3.select(`#link_text_${d['left']}_${d['node_id']}`)
				.style('visibility', 'visible');
			d3.select(`#tree_link_${d['left']}_${d['node_id']}`)
				.style('stroke', 'steelblue');
		}
		if (new_node_shown[d['right']]) {
			d3.select(`#link_text_${d['right']}_${d['node_id']}`)
				.style('visibility', 'visible');
			d3.select(`#tree_link_${d['right']}_${d['node_id']}`)
				.style('stroke', 'steelblue')
		}

		// show the satistics information
		let str  = `Feature: ${attrs[d['feature']]}; `
		 	+ `Support: ${d3.format('.2%')(d['support'])}, ${d3.sum(d['value'])}; `
		 	+ `Fidelity: ${d3.format('.2%')(d['fidelity'])}; `
		 	+ `Accuracy: ${d3.format('.2%')(d['accuracy'])}`
		// + `\nNodeID: ${d['node_id']}; Rule index: ${node2rule[d['node_id']]}`;
		d3.select('#node_description')
			.html(`<p>${str}</p>`);

		let tree_node = d3.select(this), node_id = d['node_id'];
		let size = summary_size_(node_info[node_id]['support'])
		tree_node.append('rect')
			.attr('class', 'hovered_node')
			.attr('x', -size/2)
			.attr('y', -size/2)
			.attr('width', size)
			.attr('height', size);

		// highlight the ancestors
		// get the linked node information
		let linked_node_ids = find_connection(node_id);
		linked_node_ids.sort((a,b) => a-b);

		// link the node in the summary view
		let summary_view = d3.select('#summary_view');

		// highlight the path in the tree layout
		linked_node_ids.forEach((id, i) => {
			if (i == 0) {
				return;
			}
			let parent = node_info[id]['parent'];
			let present_node = id;
			while (parent !== linked_node_ids[i-1]) {
				summary_view.select(`#tree_link_${id}_${parent}`)
					.style("stroke-width", "2px");
				id = parent;
				parent = node_info[id]['parent'];
			}
			
			summary_view.select(`#tree_link_${id}_${parent}`)
				.style('stroke', 'darkgrey')
				.style("stroke-width", "2px");
		})

		// highlight the rule in the rule view.
		// overview
		let rule_idx = node2rule[0][node_id];
		d3.select('#rule_svg').select(`#back-rect-${rule_idx}`)
			.classed('rule_hover', true);
		// highlight in the stat
		d3.select(`#stat-back-rect-${rule_idx}`)
			.classed('rule_hover', true);

		// multiple selection
		rule_idx = node2rule[3][node_id];
		d3.select('#rule_svg4').select(`#back-rect-${rule_idx}`)
			.classed('rule_hover', true);
		// highlight in the stat
		d3.select(`#stat4-back-rect-${rule_idx}`)
			.classed('rule_hover', true);
	}).on('mouseout', () => {
		d3.select('#node_description').selectAll('p').remove();
		d3.selectAll('.hovered_node').remove();

		d3.selectAll('.node_feature_name')
			.style('visibility', "hidden");
		d3.selectAll('.link-text')
			.style('visibility', "hidden");
		d3.selectAll('.link')
			.style('stroke', 'lightgrey')
			.style('stroke-width', 1);
		// overview
		d3.select('#rule_svg').selectAll('.back-rect')
			.classed('rule_hover', false);
		d3.select(`#stat`).selectAll('.back-rect')
			.classed('rule_hover', false);
		// multiple selection
		d3.select('#rule_svg4').selectAll('.back-rect')
			.classed('rule_hover', false);
		d3.select(`#stat4`).selectAll('.back-rect')
			.classed('rule_hover', false);
	});

	// Stash the old positions for transition.
	nodes.forEach(function(d) {
		d.x0 = d.x;
		d.y0 = d.y;
	});
}

function click_node(node_id) {
 	console.log("click tree node");
    click_summary_node(node_id=node_id, add_to_selection=false);

    // jump to the linked selection view
	d3.select('#tab_linked')
		.dispatch('click')
}

function dblclick(d) {
	if (d.children) {
		d._children = d.children;
		d.children = null;
	} else {
		d.children = d._children;
		d._children = null;
	}
	click_summary_node(node_id=d['data']['node_id'], add_to_selection=true);
	update_tree(d);

	// // jump to the multiple selection view
	// d3.select('#tab_multiple')
	// 	.dispatch('click')
}