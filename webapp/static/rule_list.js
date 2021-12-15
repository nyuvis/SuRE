function render_list() {
    d3.selectAll('#rule_list > *').remove();
    render_list_size_legende('#rule_list_legend', 40);

    update_list();
}

function update_list() {
    let y_offset = 0,
        x_offset = 60,
        bar_width = 0,
        indent = 30,
        rule_offset = 0;

    let list_height = (1+listData.length) * (glyphCellHeight + rectMarginTop + rectMarginBottom) + 10;;
    

    let list_svg = d3.select('#rule_list')
        .attr('height', list_height) 
        .attr('transform', `translate(10, 5)`)
        
    let rule_g = list_svg.selectAll(".rule_item")
        .data(listData)
        .enter().append('g')
        .attr('id', (d,i) => `list_content-${i}`)
        .attr("class", "rule_item")
        .attr("transform", function(d, i) { 
            if (row_sorted) {
                return `translate(0, ${yScale(row_order[i])+rectMarginTop})`; 
            }
            return `translate(0, ${yScale(i)+rectMarginTop})`; 
        })
        .on('mouseover', function(d, r_i) {
            hover_text_rule(d3.select(this), r_i);
        })
        .on('mouseout', function(d, r_i) {
            text_rule_unhover();
        })
        .on('click', function (d, r_i) {
            click_text_rule(d3.select(this), r_i, d);
        });

    // render the white background for better click react
    rule_g.append('rect')
        .attr('id', (d, r_i) => `text-back-rect-${r_i}`)
        .attr('class', 'back-rect')
        .attr('x', -rectMarginH)
        .attr('y', -rectMarginTop-rectHeight/2)
        .attr('height', `${yScale.bandwidth()}px`)
        .attr('fill', (d, r_i) => 
            clicked_rule_idx==r_i ? 'rgba(0,0,0,.05)' : 'white'
        );


    // show the rule lists
    let longest_rule = 0;
        // val_des = ['Low', 'Medium', 'High'];

    // numbering
    rule_g.append("text")
        .attr('class', 'rule_num')
        .attr("x", 0)
        .attr("dy", ".35em")
        .attr("text-anchor", "start")
        .style("font-weight", "normal")
        .style("stroke-width", "1px")
        .text((d, ix) => {
            if (row_sorted) return "R"+(row_order[ix]+1);
            return "R"+(ix+1);
        });

    // confusion matrix
    rule_g.append('g')
        .attr('transform', d => `translate(${indent})`)
        .selectAll('.hlist_conf_mat')
        .data((d ,i) => {
            let cid=d['rules'].length-1,
                node_id = r2lattice[i][cid];

            let tot = lattice[node_id]['support'],
                size = summary_size_(tot) * 2,
                x_offset = 0,
                conf_mat = [];

            bar_width = d3.max([size, bar_width]);

            target_names.forEach((d, i) => {
                conf_mat.push({
                    'name': `false-${d}`,
                    'id': node_id,
                    'x': x_offset,
                    'width': size*lattice[node_id]['conf_mat'][i][1]/tot,
                });
                x_offset += size*lattice[node_id]['conf_mat'][i][1]/tot;
                conf_mat.push({
                    'name': `true-${d}`,
                    'id': node_id,
                    'x': x_offset,
                    'width': size*lattice[node_id]['conf_mat'][i][0]/tot,
                });
                x_offset += size*lattice[node_id]['conf_mat'][i][0]/tot;
            })

            return conf_mat;
        }).enter()
        .append('rect')
        .attr('class', 'hlist_conf_mat')
        .attr('x', d => d.x)
        .attr('y', -glyphCellHeight/2)
        .attr('width', d => d.width)
        .attr('height', glyphCellHeight)
        .attr('fill', (d, i) => conf_fill[i]);

    // content 
    bar_width += 10;
    rule_g.selectAll('.content').data((d, r_i) => {
        let text_arr = [];
        text_arr.push({
            'content': "IF",
            "x": indent+bar_width,
            'fill': "black",
            "fontWeight": "bold",
        });

        let x_offset = ctx.measureText("IF ").width + indent + bar_width;
        // conditions
        conditions = d['rules'];
        // if (col_order !== undefined) {
        //     conditions.sort((a, b) => {
        //         return col_order[a['feature']] - col_order[b['feature']]
        //     })
        // }
        conditions.sort((a,b) => {
            return a['pid'] - b['pid'];
        })

        conditions.forEach((rule, i) => {
            if (i > 0) {
                text_arr.push({
                    'content': "AND ",
                    "x": x_offset,
                    'fill': "black",
                    "fontWeight": "bold",
                });
                x_offset += ctx.measureText("AND ").width
            }

            let content = attrs[rule["feature"]];

            if (rule['sign'] !== 'range') {
               
                if (rule['sign'] == '<=') {
                    content += ' < ';
                    // if (d['threshold'] == real_max[d['feature']]) str += '=';
                } else {
                    content += ' >= ';
                }
                content += readable_text(rule['threshold']) + " ";
            } else {
                content += " from " + readable_text(rule['threshold0']) + " to " + readable_text(rule['threshold1']) + " ";
            }

            content += " "
            text_arr.push({
                'content': content,
                "x": x_offset,
                'fill': "black",
                "fontWeight": "normal",
            });
            x_offset += ctx.measureText(content).width;
        });

        // outcome
        text_arr.push({
            'content': "THEN ",
            "x": x_offset,
            'fill': "black",
            "fontWeight": "bold",
        });
        x_offset += ctx.measureText("THEN ").width;

        text_arr.push({
            'content': target_names[d['label']],
            "x": x_offset,
            'fill': colorCate[d["label"]],
            "fontWeight": "normal",
        });

        x_offset += ctx.measureText(target_names[d['label']]).width + 15;
        d3.select(`#text-back-rect-${r_i}`)
            .attr('width', `${x_offset}px`);

        if (x_offset > longest_rule) {
            longest_rule = x_offset;
        }

        return text_arr;
    }).enter().append("text")
    .text(d => d.content)
    .attr("dy", ".35em")
    .attr('class', 'content')
    .attr('x', d=>d.x)
    .style("fill", d=>d.fill)
    .style("font-weight", d=>d.fontWeight);


    list_svg.attr('width', `${longest_rule + indent}px`);
    g.attr('width', `${longest_rule + indent}px`);
}

function hover_text_rule(clicked_g, rule_idx) {
    // hide selected node info
    d3.selectAll('.selected_div')
            .style('display', 'none');

    // highlight the rule in the rule view
    clicked_g.select('.back-rect')
        .classed('rule_hover', true);

    show_node_stat('#highlighted_stat', r2lattice[rule_idx][listData[rule_idx]['rules'].length-1]);
    show_tooltip(r2lattice[rule_idx][listData[rule_idx]['rules'].length-1]);
}

function text_rule_unhover() {
    d3.selectAll('.rule_hover')
        .classed('rule_hover', false);
    d3.select('#highlighted_stat').select('g').remove();
    d3.selectAll('.selected_div')
            .style('display', 'flex');
    remove_tooltip();
}

function click_text_rule(clicked_g, rule_idx, rule, ) {
    console.log("click on rule", rule_idx);

    // highlight lattice path
    d3.selectAll('.lattice_selected')
        .classed('lattice_selected', false)
        .classed('lattice_link', true);

    node_click(rule_idx, rule['rules'].length-1);
    selected_rule_rid = rule_idx;
    selected_rule_cid = rule['rules'].length-1;
}


function render_hierarchical_list() {
    d3.selectAll('#rule_hlist > *').remove();
    render_list_size_legende('#rule_hlist_legend', 10);

    update_hierarchial_list();
}

function update_hierarchial_list() {
    // Use lattice structure at present

    let hlist = lattice;

    let list_height = (1+Object.keys(hlist).length) * (glyphCellHeight + rectMarginTop + rectMarginBottom) + 10,
        yPos = d3.scaleLinear()
            .domain([0, Object.keys(hlist).length])
            .range([10, list_height]),
        unit_height = glyphCellHeight;

    let list_svg = d3.select('#rule_hlist')
        .attr('transform', `translate(10, 0)`);

    let max_depth = d3.max(Object.keys(hlist), function(key) {return hlist[key].depth}),
        unit_width = 30,
        list_width = unit_width * (1+max_depth),
        xPos = d3.scaleLinear()
            .domain([0, max_depth+1])
            .range([0, list_width]);

    // caclculate yoffset
    let y_offset = {}, count = 0;
    let ordered_node = {};
    for (let i = 1; i < Object.keys(hlist).length; i++) {
        ordered_node[preIndex[i]] = i;
    }
    for (let i = 0; i < Object.keys(hlist).length-1; i++) {
        if (hlist[ordered_node[i]].depth == 0) count++;
        y_offset[ordered_node[i]] = count * 10;
    }

    // render
    let text_width = d3.max(attrs, function(d) {return ctx.measureText(d).width});
    text_width += d3.max(target_names, function(d) {return ctx.measureText(d).width});
    text_width += ctx.measureText("AND THEN ").width;

    let bar_width = 0;

    list_svg.attr('width', `${list_width+text_width+summary_size_.range()[1]*3}`)
        .attr('height', list_height + count * 10) 

    // rule content
    let rule_g = list_svg.selectAll(".rule_node")
        .data(d3.range(1, Object.keys(hlist).length).map(function(k) {
            return hlist[k];
        }))
        .enter().append('g')
        .attr('id', (d) => `hlist_content-${d.node_id}`)
        .attr("class", "rule_node")
        .attr('width', `${unit_width}px`)

    // add confusion matrix bar
    rule_g.append('g')
        .attr('transform', d => `translate(0, ${yPos(preIndex[d.node_id])+y_offset[d.node_id]})`)
        .selectAll('.hlist_conf_mat')
        .data((d) => {
            let node_id = d['node_id'];

            let tot = lattice[node_id]['support'],
                size = summary_size_(tot) * 2,
                x_offset = 0,
                conf_mat = [];

            bar_width = d3.max([bar_width, size]);

            target_names.forEach((d, i) => {
                conf_mat.push({
                    'name': `false-${d}`,
                    'id': node_id,
                    'x': x_offset,
                    'width': size*lattice[node_id]['conf_mat'][i][1]/tot,
                });
                x_offset += size*lattice[node_id]['conf_mat'][i][1]/tot;
                conf_mat.push({
                    'name': `true-${d}`,
                    'id': node_id,
                    'x': x_offset,
                    'width': size*lattice[node_id]['conf_mat'][i][0]/tot,
                });
                x_offset += size*lattice[node_id]['conf_mat'][i][0]/tot;
            })

            return conf_mat;
        }).enter()
        .append('rect')
        .attr('class', 'hlist_conf_mat')
        .attr('x', d => d.x)
        .attr('y', -unit_height/2-rectMarginTop)
        .attr('width', d => d.width)
        .attr('height', unit_height)
        .attr('fill', (d, i) => conf_fill[i]);


    // condtion content
    bar_width += 10;
    rule_g.append('g')
        .attr("class", "rule_item")
        // .attr("transform", d => `translate(${summary_size_(lattice[d['node_id']]['support']) * 3 + 5})`)
        .attr("transform", function(d, i) { 
            return `translate(${xPos(d.depth)+1+bar_width}, ${yPos(preIndex[d.node_id])+y_offset[d.node_id]})`
        })
        .selectAll("condition_item")
        .data(d => {
            let content = attrs[d["feature"]];
            if (d['sign'] !== 'range') {
                if (d['sign'] == '<=') {
                    content += ' < ' ;
                } else {
                    content += ' >= ';
                }
                content += readable_text(d['threshold']) + " ";
            } else {
                content += " from " + readable_text(d['threshold0']) + " to " + readable_text(d['threshold1']) + " ";
            }

            let conj = "AND ";

            if (d.depth == 0) {
                conj = "IF "
            }

            d['text_width'] = ctx.measureText(content).width + ctx.measureText(conj).width;

            return [{"x": 0, "content": conj}, {"x": ctx.measureText(conj).width, "content": content}];
        }).enter()
        .append('text')
        .attr("class", "condition_item")
        .text(d => d.content)
        .attr("x", d=>d.x)
        .style("font-weight", (d, i) => i%2 == 0 ? "bold" : "normal");


     rule_g
        .append('rect')
        .attr('class', 'node_mask')
        .attr('id', (d, node_id) =>`rulemask-${d['node_id']}`)
        .attr('x', d=>xPos(d.depth)+1+bar_width)
        .attr('y', d=>-unit_height/2-rectMarginTop-2+yPos(preIndex[d.node_id])+y_offset[d.node_id])
        .attr('width', d=>d['text_width']+2)
        .attr('height', d=>unit_height+6)
        .on('click', (d) => {
            node_click(lattice2r[d['node_id']][0], lattice2r[d['node_id']][1]);          
        })
        .on('mouseover', d=>{
            node_hover(d['node_id']);
        })
        .on('mouseout', d=>{
            node_unhover(d['node_id']);
        })

    // render select numbering
    let saved_node_mark = rule_g.append('g')
        .attr('class', (d) => d['node_id'] in saved_rules && show_saved_node_mark? 'saved_node_highlight saved_node' : 'saved_node_hidden saved_node' )
        .attr('id', (d) =>`saved_item-${d['node_id']}`)
        .attr('transform', (d) => `translate(${xPos(d.depth)+bar_width}, ${-unit_height/2-rectMarginTop-2+yPos(preIndex[d.node_id])+y_offset[d.node_id]})`);

    saved_node_mark.append('circle')
        .attr('r', 6);

    saved_node_mark.append('text')
        .text((d) => d['node_id'] in saved_rules ? saved_rules[d['node_id']].idx+1 : "");

    // condition links
    let links = [];
    for (let i = 1; i < Object.keys(hlist).length; i++) {
        if (hlist[i]['children_id'].length > 0) {
            for (let j = 0; j < hlist[i]['children_id'].length; j++){
                links.push({
                    'source': i,
                    'target': hlist[i]['children_id'][j]
                })
            }
        }
    }

    let list_links = list_svg.append('g')
        .attr('class', '.list_links')
    
    let line = d3.line()
        .x(d=>d.x)
        .y(d=>d.y);

    let link_lines = list_links.selectAll('.list_link')
        .data(links)
        .enter()
        .append('path')
        .attr('class', 'list_link')
        .attr("transform", `translate(${bar_width})`)
        .attr('id', d => `hlist-link-${d['source']}-${d['target']}`)
        .attr("d", d => {
            let arr = [
                {'x': xPos(hlist[d.source].depth)+7, 'y': yPos(preIndex[hlist[d.source].node_id])+y_offset[d.source]},
                {'x': xPos(hlist[d.source].depth)+7, 'y': yPos(preIndex[hlist[d.target].node_id])+y_offset[d.target]-5},
                {'x': xPos(hlist[d.target].depth), 'y': yPos(preIndex[hlist[d.target].node_id])+y_offset[d.target]-5},
            ];
            return line(arr);
        })
        .attr('stroke', 'darkgrey')
        .attr('fill', "none");
}
