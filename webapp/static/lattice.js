let max_num, 
    unit_width =25, unit_height = 30, 
    margin_h = 10, margin_v = 80,
    feat_start_pos,
    r2lattice,
    lattice2r,
    lattice_node_selected = -1,
    pos2r, r2pos;

function render_lattice() {
    d3.selectAll('#lattice > *').remove();

    let lattice_height = (filter_threshold['num_feat']-1) * (unit_height+margin_v)+feat_name_height+unit_height*2;
    d3.select('#lattice')
        .attr('height', lattice_height) 
        .append('g')
        .attr('id', 'lattice_graph')

    update_lattice_graph();
}

function update_lattice_graph() {
    let view = d3.select('#lattice_graph');
    view.selectAll('*').remove();

    // render feature names 
    let column = view.append('g')
        .attr('class', 'attr_name')
        .selectAll(".column").data(attrs)
        .enter().append("g")
        .attr("class", `column`)
        .attr('id', (d,i)=>`col-${i}`)
        .attr("transform", function(d, i) { 
            return `translate(${feat_start_pos[col_order[i]]+10}, 
            ${feat_name_height+yScale(0)-font_size})rotate(330)`; });

    let col_count = 0;
    column.append("text")
        .attr("y", yScale.bandwidth() / 1.5 - 5)
        .attr("dy", ".32em")
        .attr("text-anchor", "start")
        .text((d,i) => {
            if (feat_max_num[col_order[i]]<=0) return "";
            col_count+=feat_max_num[col_order[i]];
            let textLength = ctx.measureText(d).width;
            let text = d;
            let txt = d;
            while (textLength > feat_name_height * 2 - 50) {
                text = text.slice(0, -1);
                textLength = ctx.measureText(text+'...').width;
                txt = text+'...';
            }
            return txt;
        })
        .append('title')
        .text(d => d);
    d3.select('#lattice').attr('width', col_count * (unit_width+margin_h)+feat_name_height*1.41);

    // render divider line
    view = view.append('g')
        .attr('class', 'lattice_graph')
        .attr('transform', `translate(10, ${feat_name_height})`)
    let divider = view.append('g')
        .attr('class', 'divider')
    to_sep = [];
    attrs.forEach((d,i) => {
        if (feat_max_num[col_order[i]]>0) {
            to_sep.push(i);
        }
    })
    divider.selectAll('feat_divider')
        .data(to_sep)
        .enter()
        .append('line')
        .attr('class', 'feat_divider')
        .attr('x1', (idx) => feat_start_pos[col_order[idx]+1] - margin_h/2)
        .attr('x2', (idx) => feat_start_pos[col_order[idx]+1] - margin_h/2)
        .attr('y1', 0)
        .attr('y2', (filter_threshold['num_feat']+1.5) * (unit_height+margin_v))
        .style("stroke-dasharray", ("3, 3")) 
        .style('stroke', 'darkgrey')
    
    // render links
    let links = [];
    for (let i = 1; i < Object.keys(lattice).length; i++) {
        if (lattice[i]['children_id'].length > 0) {
            for (let j = 0; j < lattice[i]['children_id'].length; j++){
                links.push({
                    'source': i,
                    'target': lattice[i]['children_id'][j]
                })
            }
        }
    }
    let lattice_links = view.append('g')
        .attr('class', '.lattice_links')
    
    let link_lines = lattice_links.selectAll('.lattice_link')
        .data(links)
        .enter()
        .append('line')
        .attr('class', 'lattice_link')
        .attr('id', d => `lattice-link-${d['source']}-${d['target']}`)
        .attr('x1', d=>{
            let col = lattice[d['source']]['feature']
            return feat_start_pos[col_order[col]] + (unit_width+margin_h)*r2pos[d['source']]+ unit_width/2;
        })
        .attr('x2', d=>{
            let col = lattice[d['target']]['feature']
            return feat_start_pos[col_order[col]] + (unit_width+margin_h)*r2pos[d['target']]+ unit_width/2;
        })
        .attr('y1', d=>lattice[d['source']]['depth']*(unit_height+margin_v)+ unit_height/2)
        .attr('y2', d=>lattice[d['target']]['depth']*(unit_height+margin_v)+ unit_height/2)
        .attr('stroke', 'darkgrey')

    // render nodes
    conf_mat_nodes = view.selectAll(".lattice_node")
        .data(d3.range(1, Object.keys(lattice).length).map(function(k) {
            return lattice[k];
        }))
        .enter().append("g")
        .attr('class', 'lattice_node')
        .attr('id', (d) => `latnode-${d['node_id']}`)
        .attr('transform', (d) => {
            // let node_id = r2lattice[d['rid']][cid];
            let node_id = d['node_id'];

            let x_offset = feat_start_pos[col_order[d['feature']]] + (unit_width+margin_h)*r2pos[node_id] + unit_width/2,
            y_offset = d['depth'] * (unit_height+margin_v) + unit_height/2;
            return `translate(${x_offset}, ${y_offset})`
        })

    // let conf_fill = [ '#4f7d8c',colorCate[0],`#995a57`, colorCate[1],]
    let conf_fill = ['url(#fp_pattern)', colorCate[0], 'url(#fn_pattern)', colorCate[1]]
    conf_mat_nodes.selectAll('.lattice_conf_mat')
        .data((d) => {
            // let cid=d['cid'],
                // node_id = r2lattice[d['rid']][cid];
            let node_id = d['node_id'];

            let size = summary_size_.range()[1],
                scale = summary_size_(lattice[node_id]['support']) / size,
                tot = lattice[node_id]['support'],
                v0 = d3.sum(lattice[node_id]['conf_mat'][0]), 
                v1 = d3.sum(lattice[node_id]['conf_mat'][1]);
            conf_mat = [
                {'name': 'fp', 'id':node_id, 'scale': scale,
                    'x': -size/2, 
                    'width': size*v0/tot,
                    'y': -size/2, 
                    'height': v0 > 0 ? size*lattice[node_id]['conf_mat'][0][1]/v0 : 0,
                },
                {'name': 'tp', 'id':node_id,'scale': scale,
                    'x': -size/2, 
                    'width': size*v0/tot,
                    'y': v0 > 0 ? -size/2+size*lattice[node_id]['conf_mat'][0][1]/v0 : 0, 
                    'height': v0 > 0 ? size*lattice[node_id]['conf_mat'][0][0]/v0 : 0,
                },
                {'name': 'fn', 'id':node_id,'scale': scale,
                    'x': -size/2+size*v0/tot, 
                    'width': size*v1/tot,
                    'y': -size/2, 
                    'height': v1 > 0 ? size*lattice[node_id]['conf_mat'][1][0]/v1 : 0,
                },
                {'name': 'tn', 'id':node_id,'scale': scale,
                    'x': -size/2+size*v0/tot, 
                    'width': size*v1/tot,
                    'y': v1 > 0 ? -size/2+size*lattice[node_id]['conf_mat'][1][0]/v1: 0, 
                    'height': v1 > 0 ? size*lattice[node_id]['conf_mat'][1][1]/v1 : 0,
                },
            ];
            return conf_mat;
        }).enter()
        .append('g')
        .attr('class', 'lattice_conf_mat')
        .attr('transform', d => `scale(${d.scale})`)
        .append('rect')
        .attr('x', d => d.x)
        .attr('y', d=>d.y)
        .attr('width', d => d.width)
        .attr('height', d => d.height)
        .attr('fill', (d, i) => conf_fill[i]);

    // condition metaphor 
    conf_mat_nodes.selectAll(".rule-fill")
        .data(function(d) { 
            let node_id = d['node_id']
            let feat = d['feature'],
                // size = summary_size_(lattice[r2lattice[d['rid']][d['cid']]]['support'])/2,
                size = summary_size_(lattice[node_id]['support'])/2,
                to_render = [];

            cond = listData[lattice2r[node_id][0]]['rules'][lattice2r[node_id][1]]
            d3.range(filter_threshold['num_bin']).forEach(pdc => {
                to_render.push({'feature': feat, 
                    'value': pdc, 
                    'show': cond['range'].indexOf(pdc)>=0,
                    'x_offset': - sqWidth * filter_threshold['num_bin'] / 4,
                    'y_offset': size+2,
                })
            })
            
            return to_render; 
        })
        .enter().append("rect")
        .attr("x", function(d) { 
            return rectXst[d['value']]/2 + d.x_offset;
        })
        .attr("width", sqWidth/2)
        .attr("y", d=>d.y_offset )
        .attr("height", glyphCellHeight/2)
        .attr("fill", d => d['show'] ? "#484848": 'white')
        .attr("stroke", "black");

    // node clickevent
    
    conf_mat_nodes
        .append('rect')
        .attr('class', 'node_mask')
        // .attr('id', d=>`nodemask-${r2lattice[d['rid']][d['cid']]}`)
        .attr('id', (d, node_id) =>`nodemask-${d['node_id']}`)
        .attr('x', d=>-summary_size_(lattice[d['node_id']]['support'])/2)
        .attr('y', d=>-summary_size_(lattice[d['node_id']]['support'])/2)
        .attr('width', d=>summary_size_(lattice[d['node_id']]['support']))
        .attr('height', d=>summary_size_(lattice[d['node_id']]['support']))
        .on('click', (d) => {
            node_click(lattice2r[d['node_id']][0], lattice2r[d['node_id']][1]);          
        })
        .on('mouseover', d=>{
            node_hover(d['node_id']);
        })
        .on('mouseout', d=>{
            node_unhover(d['node_id']);
        })

    conf_mat_nodes.append('text')
        .attr('class', 'lattice_cond')
        .attr('y', d=>summary_size_(lattice[d['node_id']]['support'])/2 + sqWidth/2 + 15)
        .text(d => {
            if (d['sign']=='range') {
                let str = `[${readable_text(d['threshold0'])}, ${readable_text(d['threshold1'])}`;
                if (d['threshold1'] == real_max[d["feature"]]) {
                    str += ']';
                } else {
                    str += ')';
                }
                return str;
            } else {
                let sign = d['sign'][0];
                if (sign == '>') {
                    sign = '>='
                }
                return `${sign}${readable_text(d['threshold'])}`;
            }
        })
        // .style('visibility', 'hidden')
}

function construct_lattice() {
    // initialize
    pos2r = {}, r2pos = {}, r2lattice={}, lattice2r={};
    for (let i = 0; i<attrs.length; i++) {
        pos2r[i] = {};
        for (let j=0; j<filter_threshold['num_feat']; j++) {
            pos2r[i][j] = [];
        }
    }
    // set position
    listData.forEach((conds, rid) => {
        let rule = conds['rules'].slice();
        // rule = rule.sort((a, b) => col_order[a['feature']] - col_order[b['feature']]);
        r2lattice[rid] = {};
        let parent = 0;
        rule.forEach((cond, cid) => {
            let lattice_node_id = find_lattice_node(parent, cond);
            r2lattice[rid][cid] = lattice_node_id;
            lattice2r[lattice_node_id] = [rid, cid]
            parent = lattice_node_id;
            if (!pos2r[col_order[cond['feature']]][cid].includes(lattice_node_id )) {
                pos2r[col_order[cond['feature']]][cid].push(lattice_node_id);
                // r2pos[lattice_node_id] = pos2r[col_order[cond['feature']]][cid].length-1;   
            }
        });
    });

    // predicate ordering in each layer
    for (let ii = 0; ii < attrs.length; ii++) {
        let i = col_order[ii];
        if (ii == 21) {
            let x = 0;
        }
        for (let j = 0; j < Object.keys(pos2r[i]).length; j++) {
            let lat_node_order = generate_node_order_by_feature(ii, j, true),
                original_pos2r = pos2r[i][j].slice();

            for (let k = 0; k <  pos2r[i][j].length; k++) {
                r2pos[original_pos2r[k]] = lat_node_order[k];
                pos2r[i][j][lat_node_order[k]] = original_pos2r[k];
            }
        }
    }

    // width setting
    max_num = 0;
    for (let j = 0; j<filter_threshold['num_feat']; j++) {
        let layer_w = 0;
        for (let i = 0; i<attrs.length; i++) {
            layer_w += pos2r[col_order[i]][j].length;
        }
        if (layer_w>max_num)
            max_num = layer_w;
    }
    feat_max_num = {};
    for (let i = 0; i<attrs.length; i++) {
        feat_max_num[col_order[i]] = -1;
        for (let j = 0; j<filter_threshold['num_feat'];j++) {
            if (pos2r[col_order[i]][j].length > feat_max_num[col_order[i]])
                feat_max_num[col_order[i]] = pos2r[col_order[i]][j].length;
        }    
    }
    feat_start_pos = [];
    let pre_sum = 0;
    for (let i = 0; i<=attrs.length; i++) {
        feat_start_pos.push(pre_sum * (unit_width+margin_h));
        pre_sum += feat_max_num[i];
    }
}

function find_lattice_node(parent, cond) {
    let node_id = -1;
    lattice[parent]['children_id'].forEach((idx) => {
        let node = lattice[idx];
        if (cond['feature']==node['feature'] && cond['sign']==node['sign']) {
            if (cond['sign'] == 'range') {
                if (cond['threshold0']==node['threshold0'] && cond['threshold1']==node['threshold1']){
                    node_id = node['node_id'];
                    return;
                }
            } else {
                if (cond['threshold']==node['threshold']){
                    node_id = node['node_id'];
                    return;
                }
            }
        }
    })
    return node_id;
}


function node_click(rid, cid) {
    console.log("click on lattice node", rid, cid);
    // remove existing rule or node highlight
    rule_svg.selectAll('.rule_highlight')
        .classed('rule_highlight', false);

    // clear selected 
    d3.select('#rule_list')
        .selectAll('.rule_highlight')
        .classed('rule_highlight', false);

    d3.selectAll('.lattice_link')
        .classed('lattice_selected', false);

    d3.selectAll(`.lattice_node_selected`)    
        .classed('lattice_node_selected', false)
        .classed('lattice_node', true);

    d3.select('#selected_stat g').remove();
    d3.select('#rule_stat_selected g')
            .remove();

    if (r2lattice[rid][cid] != lattice_node_selected) {
        // highlight the rule in the rule view
        lattice_node_selected = r2lattice[rid][cid];
        
        d3.selectAll('.selected_div')
            .style('display', 'flex');
        
        d3.select(`#ruleg--${rid}`).select('.back-rect')
            .classed('rule_highlight', true);
        d3.select(`#list_content-${rid}`).select('.back-rect')
            .classed('rule_highlight', true);

        d3.select(`#latnode-${lattice_node_selected}`)    
            .classed('lattice_node', false)
            .classed('lattice_node_hovered', false)
            .classed('lattice_node_selected', true);

        d3.select('#selected_save')
            .style('display', 'flex');
        d3.select('#rule_selected_save')
            .style('display', 'flex');

        // highlight lattice path
        select_lattice_ancestors(rid, cid, true)

        lattice[lattice_node_selected]['children_id'].forEach((child) => {
            d3.select(`#lattice-link-${lattice_node_selected}-${child}`)
                .classed('lattice_selected', true)

            // d3.select(`#latnode-${child}`)    
            //     .classed('lattice_node', false)
            //     .classed('lattice_node_hovered', false)
            //     .classed('lattice_node_selected', true);
        });

        let rule_str = generate_rule_desp(rid, cid);

        d3.select('#selected_desp')
            .html(rule_str)
        d3.select('#rule_description_selected')
            .html(rule_str);
        show_node_stat('#selected_stat', r2lattice[rid][cid]);
        show_node_stat('#rule_stat_selected', r2lattice[rid][cid]);
    } else {
        // remove selected rule view
        d3.select('#selected_stat')
            .style('display', 'none');

        d3.select('#rule_stat_selected')
            .style('display', 'none');

        // fade away the rule in the rule view
        d3.select(`#ruleg--${rid}`).select('.back-rect')
            .classed('rule_highlight', false);
        d3.select(`#list_content-${rid}`).select('.back-rect')
            .classed('rule_highlight', false);
        
        // fade away lattice path
        d3.selectAll('.lattice_selected')
            .classed('lattice_selected', false);

        // hide text
        d3.selectAll(`.lattice_node_selected`)    
            .classed('lattice_node', true)
            .classed('lattice_node_hovered', false)
            .classed('lattice_node_selected', false);

        d3.selectAll('.selected_div')
            .style('display', 'none');

        lattice_node_selected = -1;
        d3.select('#selected_desp')
            .html("");
        d3.select('#rule_description_selected')
            .html("");
        d3.select('#selected_stat g')
            .remove();
    }
}

function node_hover(node_id) {
    d3.selectAll('.lattice_link')
        .classed('lattice_highlight', false)
    
    // grey out all nodes
    d3.selectAll('.lattice_node')
        .classed('lattice_node', false)
        .classed('lattice_node_greyout', true);

    // highlight the feature of hovered node
    d3.select(`#col-${lattice[node_id]['feature']}`)
        .classed('column', false)
        .classed('column_highlight', true);
    
    // highlight lattice path
    highlight_lattice_ancestors(node_id);

    // show node text
    d3.select(`#latnode-${node_id}`)
        .classed('lattice_node_greyout', false)
        .classed('lattice_node_hovered', true)
            
    lattice[node_id]['children_id'].forEach((child) => {
        d3.select(`#lattice-link-${node_id}-${child}`)
            .classed('lattice_highlight', true)

        // show text
        d3.select(`#latnode-${child}`)
            .classed('lattice_node', false)
            .classed('lattice_node_hovered', true)
    });

    d3.select('#highlighted_desp')
        .html(generate_rule_desp(lattice2r[node_id][0], lattice2r[node_id][1]));

    show_node_stat('#highlighted_stat', node_id);
}

function highlight_lattice_ancestors(node_id) {
  // find ancesters
  let p_id = node_id;
  while (p_id > 0) {
    d3.select(`#lattice-link-${lattice[p_id]['parent']}-${p_id}`)
        .classed('lattice_highlight', true);

    d3.select(`#latnode-${p_id}`)
        .classed('lattice_node_hovered', true)
        .classed('lattice_node_greyout', false);

    d3.select(`#col-${lattice[p_id]['feature']}`)
        .classed('column_highlight', true)
        .classed('column', false);

    p_id = lattice[p_id]['parent'];
  }
}

function node_unhover(node_id) {
    d3.selectAll(`.lattice_node_hovered:not(.lattice_node_selected)`)
        .classed('lattice_node', true)
        .classed('lattice_node_hovered', false)

    d3.selectAll('.lattice_highlight')
        .classed('lattice_highlight', false);

    d3.selectAll('.lattice_node_greyout')
        .classed('lattice_node_greyout', false)
        .classed('lattice_node', true);

    d3.selectAll(`.column_highlight`)
        .classed('column_highlight', false)
        .classed('column', true)

    d3.select('#highlighted_desp')
        .html("");
    d3.select('#highlighted_stat g')
        .remove();
}

function generate_rule_plain_text(rid, cid) {
    // update rule description
    let rules = listData[rid];
    let str = "";

    let rule_to_show = Array.from(rules['rules']);
    // rule_to_show.sort((a, b) => col_order[a['feature']] - col_order[b['feature']]);
    for (let i = 0; i <= cid; i++) {
        if (i>0) {
            str += "AND "
        } else {
            str += " IF "
        }
        let d = rule_to_show[i];
        str += `${attrs[d['feature']]}`;
        if (d['sign'] !== 'range') {
            // str += " " + d['sign'];
            // if (d['sign'] == '>') str += '=';
            if (d['sign'] == '<=') {
                str += "<";
                // if (d['threshold'] == real_max[d['feature']]) str += '=';
            } else {
                str += ">=";
            }
            str += readable_text(d['threshold']) + " "
        } else {
            // str += " btw. (" + d['threshold0'] + ', ' + d['threshold1'] + '] '
            // let threshold0 = real_percentile['percentile_table'][Math.ceil(d['threshold0'])][d['feature']],
            //  threshold1 = real_percentile['percentile_table'][Math.floor(d['threshold1'])][d['feature']]

            str += " from " + readable_text(d['threshold0']) + " to " + readable_text(d['threshold1']) + " ";
        }
    }

    if (cid == rules['rules'].length - 1 || cid == rules['rules'].length - 2 && lattice[r2lattice[rid][cid]]['children_id'].length == 1) {
        str += "THEN " + target_names[rules['label']];
    }
    return str;
}

function generate_rule_desp(rid, cid) {
    // update rule description
    let rules = listData[rid];
    let str = "";

    let rule_to_show = Array.from(rules['rules']);
    // rule_to_show.sort((a, b) => col_order[a['feature']] - col_order[b['feature']]);
    for (let i = 0; i <= cid; i++) {
        if (i>0) {
            str += "<b><br/>AND</b> "
        } else {
            str += "<b>IF</b> "
        }
        let d = rule_to_show[i];
        str += `<u>${attrs[d['feature']]}</u>`;
        if (d['sign'] !== 'range') {
            // str += " " + d['sign'];
            // if (d['sign'] == '>') str += '=';
            if (d['sign'] == '<=') {
                str += "<";
                // if (d['threshold'] == real_max[d['feature']]) str += '=';
            } else {
                str += ">=";
            }
            str += readable_text(d['threshold']) + " "
        } else {
            // str += " btw. (" + d['threshold0'] + ', ' + d['threshold1'] + '] '
            // let threshold0 = real_percentile['percentile_table'][Math.ceil(d['threshold0'])][d['feature']],
            //  threshold1 = real_percentile['percentile_table'][Math.floor(d['threshold1'])][d['feature']]

            str += " from " + readable_text(d['threshold0']) + " to " + readable_text(d['threshold1']) + " ";
        }
    }

    if (cid == rules['rules'].length - 1 || cid == rules['rules'].length - 2 && lattice[r2lattice[rid][cid]]['children_id'].length == 1) {
        str += "<b><br/>THEN</b> " + `<span style="color: ${colorCate[rules['label']]}">` + target_names[rules['label']] + "</span>.";
    }
    return str;
}

function select_lattice_ancestors(rid, cid, val) {
  // find ancesters
  let p_id = r2lattice[rid][cid];
  while (p_id > 0) {
    d3.select(`#lattice-link-${lattice[p_id]['parent']}-${p_id}`)
        .classed('lattice_selected', val);

    d3.select(`#latnode-${p_id}`)    
        .classed('lattice_node', false)
        .classed('lattice_node_hovered', true);

    p_id = lattice[p_id]['parent'];
  }
}

function show_node_stat(svg_id, node_id) {
    let stat = d3.select(svg_id)
        .append('g')
        .attr('class', 'stat_bar');

    // vertical order: false negative, true negative, false positive, true positive
    let conf_fill = [ 'url(#fp_pattern)', colorCate[0], 'url(#fn_pattern)', colorCate[1], ]

    let size = summary_size_(lattice[node_id]['support']) * 5,
        tot = lattice[node_id]['support'];

    let stat_bar_val = [
        {'name': `false ${target_names[0]}`, 'val':lattice[node_id]['conf_mat'][0][1],
            'percentage': lattice[node_id]['conf_mat'][0][1]/tot,
            'width': size/tot*lattice[node_id]['conf_mat'][0][1],
            'y': 0,
        },
        {'name': `true ${target_names[0]}`, 'val':lattice[node_id]['conf_mat'][0][0],
            'percentage': lattice[node_id]['conf_mat'][0][0]/tot,
            'width': size/tot*lattice[node_id]['conf_mat'][0][0],
            'y': unit_height/2,
        },
        {'name': `false ${target_names[1]}`, 'val':lattice[node_id]['conf_mat'][1][0],
            'percentage': lattice[node_id]['conf_mat'][1][0]/tot,
            'width': size/tot*lattice[node_id]['conf_mat'][1][0],
            'y': unit_height,
        },
        {'name': `true ${target_names[1]}`, 'val':lattice[node_id]['conf_mat'][1][1],
            'percentage': lattice[node_id]['conf_mat'][1][1]/tot,
            'width': size*lattice[node_id]['conf_mat'][1][1]/tot,
            'y': unit_height*1.5,
        },
    ];

    stat.selectAll('.lattice_stat_bar')
        .data(stat_bar_val).enter()
        .append('rect')
        .attr('class', 'lattice_stat_bar')
        .attr('x', 0)
        .attr('y', d => d.y)
        .attr('width', d => d.width)
        .attr('height', unit_height/3)
        .attr('fill', (d, i) => conf_fill[i]);

    let text_hint = stat.append('g')
        .attr('class', 'text_hint')
        .attr('transform', `translate(${size}, 0)`)

    text_hint.selectAll('.lattice_stat_text')
        .data(stat_bar_val).enter()
        .append('text')
        .attr('class', 'lattice_stat_text')
        .attr('x', 0)
        .attr('y', d => d.y+unit_height/3)
        .text(d => `${d.name}: ${d.val} (${(d.percentage*100).toFixed(2)}%)`);

    // overlapping b/w hovered and selected
    if (lattice_node_selected >= 0 && (svg_id=="#rule_stat_hovered" || svg_id=="#highlighted_stat")) {
        let coverage = stat.append('g')
            .attr('class', 'coverage_compare')
            .attr('transform', `translate(0, ${unit_height*2.5})`)

        let subgroup1 = lattice[lattice_node_selected]['matched_data'],
            subgroup2 = lattice[node_id]['matched_data'],
            overlapped = subgroup1.filter(value => subgroup2.includes(value)).length;

        coverage.append('text')
            .text(`#Data instances also covered by the clicked rule: ${overlapped}`);

    }
}

function generate_node_order_by_feature(feat_idx, cid, ascending) {
    let node_info = [], node_order = {};

    for (let k = 0; k < pos2r[col_order[feat_idx]][cid].length; k++) {
        let node = lattice[pos2r[col_order[feat_idx]][cid][k]]
        if (ascending) {
            th0 = MAXINT;
            th1 = MAXINT;
        } else {
            th0 = -MAXINT;
            th1 = -MAXINT;
        }
        if (node['sign'] == 'range') {
            th0 = node['threshold0'];
            th1 = node['threshold1'];
        } else if (node['sign'] == '<=') {
            th1 = node['threshold'];
            th0 = real_min[feat_idx];
        } else if (node['sign'] == '>') {
            th0 = node['threshold'];
            th1 = real_max[feat_idx];
        } 
        node_info.push({
            'idx': k,
            'th0': th0,
            'th1': th1,
        })
    }

    node_info.sort((a, b) => {
        if (a.th0 !== b.th0)
          return ascending ? a.th0 - b.th0 : b.th0 - a.th0;
        else if (a.th1 !== b.th1)
          return ascending ? a.th1 - b.th1 : b.th1 - a.th1;
        // else   
        //   return pre_order[a.node_id].order - pre_order[b.node_id].order;
    });
    node_info.forEach((d, i) => node_order[d.idx] = i);

    return node_order;
}