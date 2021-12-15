let ori_order = [];
let col_order = [], row_order = [];

let phrased_rule_id = -1;
let NODE_ENCODING = "purity";
let SUMMARY_LAYOUT = "tree";
let X_POS = 'fidelity';
let selected_feat = -1;
let selected_filter = {}, data_selected_filter = {}, pred_filter = -1;
let goal_debug = -1, debug_class = -1;

let saved_rules = {}, saved_rules_idx2id = [], selected_rule_text = "", selected_rule_rid, selected_rule_cid;

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

// Key for local storage, use to save and access.
let FILE_KEY = 'temp_file';

// fire processUpload when the user uploads a file.
document.querySelector('#user_defined_file').addEventListener('change', handleFileUpload, false);
// Setup file reading
let reader = new FileReader();
reader.onload = handleFileRead;

function handleFileUpload(event) {
    let file = event.target.files[0];
    reader.readAsText(file); // fires onload when done.
}

function handleFileRead(event) {
    let save = JSON.parse(event.target.result);
    // console.log(save) // {hp: 32, maxHp: 50, mp: 11, maxMp: 23}
    // window.localStorage.setItem(FILE_KEY, JSON.stringify(save));
    let existing_files = retrieveSave();
    let present_file = "temp"+ new Date().getTime();
    if (existing_files == null) {
        existing_files = [];
    } 
       existing_files.push(present_file);
   
    window.localStorage.setItem(FILE_KEY, JSON.stringify(existing_files));

    let to_post = {'file_key': present_file, 'content': save}

    postData("upload/", JSON.stringify(to_post), (info) => {
        console.log(info);
    })
}

function retrieveSave() {
    return JSON.parse(localStorage.getItem(FILE_KEY))
}

window.onbeforeunload = function() {
    if (folder == "user_defined") {
        let to_post = {'file_key': retrieveSave()}
        postData("clear_user_defined/", JSON.stringify(to_post), (info) => {
            console.log(info);
        })
        localStorage.removeItem(FILE_KEY);
    }
    return '';
};

d3.select('#dataset')
    .on('change', function() {
        let val = d3.select(this).property('value');
        folder = val;
        if (val == "user_defined") {
            click_setting();
        } else {
            d3.select("#progress")
                .style('display', 'block');
            
            set_default_rule_para();
            explore_stat = {
              "regeneration": 0,
              "view_click": [1,0,0,0],
            }

            intrusion = false;
            loadData(intrusion, true);
        }
    })


d3.select('#analysis_goal')
    .on('change', function() {
        goal_debug = 1 - goal_debug;
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
            filter_threshold['support'] = +support_val;
            return this.value;
        });

    d3.select('#fidelity_val')
        .attr('value', function() {
            fidelity= this.value;
            filter_threshold['fidelity'] = +fidelity;
            return this.value;
        });

    d3.select('#feature_val')
        .attr('value', function() {
            num_feat_val = this.value;
            filter_threshold['num_feat'] = +num_feat_val;
            return this.value;
        });

    d3.select('#feature_bin')
        .attr('value', function() {
            num_feat_bin= this.value;
            filter_threshold['num_bin'] = +num_feat_bin;
            return this.value;
        });

    support_val = parseFloat(support_val);
    filter_threshold['support'] = support_val;

    num_feat_val = parseFloat(num_feat_val);
    filter_threshold['num_feat'] = num_feat_val;    

    d3.select("#myModel")
        .style("display", "none");

    loadData(intrusion, false);

    d3.select("#progress")
        .style("display", "block");

    explore_stat['regeneration']++;
}

function click_setting() {
    // console.log("click")
    document.getElementById('support_val').value = filter_threshold['support'];

    if (folder == 'user_defined') {
        d3.select('#upload')
            .style('display', 'flex');
    } else {
        d3.select('#upload')
            .style('display', 'none');
    }
    d3.select("#myModel")
        .style("display", "block");
}

function click_cancel(id) {
    d3.select(id)
        .style("display", "none");
}

function check_saved_rules() {    
    d3.select("#saved_rule_list")
        .style("display", "block");
}

function click_gotit(){
    d3.select("#error_block")
        .style("display", "none");
    d3.select("#myModel")
        .style("display", "block");
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
    row_sorted = false;
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

function select_filter(feat_ix, val_ix, neg) {
    let str = attrs[feat_ix];

    if (neg == 1) {
        str = "not contain " + str;
    } else {
        str = "contain " + str; 
    }

    if (val_ix == -1) {
        str += ': any value'
    } else {
        str += ': no.' + (+val_ix+1) + ' range'
    }

    if (Object.keys(selected_filter).indexOf(feat_ix)>=0) {
        d3.selectAll(`#filterfeat-${feat_ix} > div`)._groups[0][0].textContent = str;
    } else {
        let filter = d3.select('#selected_filter')
            .append('div')
            .attr('class', 'flex-row filter-summary')
            .attr('id', `filterfeat-${feat_ix}`)

        filter.append('div')
            .attr('class', 'filter-content')
            .text(str);

        filter.append('div')
            .attr('class', 'filter-content')
            .text('x')
            .on('click', function() {
                let fix = this.parentNode.id.split('-')[1];
                delete selected_filter[fix]
                this.parentNode.parentNode.removeChild(this.parentNode);
            })
    }
    
    // update selected filters 
    selected_filter[feat_ix] = {"val_ix": val_ix, "neg": neg};
}

function select_data_filter(feat_ix, val_ix) {
    let str = attrs[feat_ix];
    if (val_ix == -1) {
        str += ': any value'
    } else {
        str += ': no.' + (+val_ix+1) + ' range'
    }

    if (Object.keys(data_selected_filter).indexOf(feat_ix)>=0) {
        d3.selectAll(`#data_filterfeat-${feat_ix} > div`)._groups[0][0].textContent = str;
    } else {
        let filter = d3.select('#data_selected_filter')
            .append('div')
            .attr('class', 'flex-row filter-summary')
            .attr('id', `data_filterfeat-${feat_ix}`)

        filter.append('div')
            .attr('class', 'filter-content')
            .text(str);

        filter.append('div')
            .attr('class', 'filter-content')
            .text('x')
            .on('click', function() {
                let fix = this.parentNode.id.split('-')[1];
                delete data_selected_filter[fix]
                this.parentNode.parentNode.removeChild(this.parentNode);
            })
    }
    
    // update selected filters 
    data_selected_filter[feat_ix] = val_ix;
}

function set_prediction_filter(pid) {
    let str = 'predict: ' + target_names[pid];
    d3.select(`.checked_circle`).remove();

    if (pred_filter == pid) {
        // cancel selected prediction
        pred_filter = -1;
        d3.select('#filterpred').remove();
    } else {
        // change selected prediction
        d3.select(`#predgroup-${pid}`)
            .append('circle')
            .attr('class', 'checked_circle')
            .attr("cx", 20)
            .attr("cy", 0)
            .attr('r', legend_r)
            .style('stroke', 'black')
            .style('stroke-width', '2px')
            .style('fill', 'none');

        if (pred_filter < 0) {
            // add selected prediction
            let filter = d3.select('#selected_filter')
                .append('div')
                .attr('class', 'flex-row filter-summary')
                .attr('id', `filterpred`)

            filter.append('div')
                .attr('class', 'filter-content')
                .text(str);

            filter.append('div')
                .attr('class', 'filter-content')
                .text('x')
                .on('click', function() {
                    let fix = this.parentNode.id.split('-')[1];
                    pred_filter = -1;
                    this.parentNode.parentNode.removeChild(this.parentNode);
                    d3.select(`.checked_circle`).remove();
                })
        } else {
            d3.selectAll(`#filterpred > div`)._groups[0][0].textContent = str;
        }
        pred_filter = pid;
        if (goal_debug > 0) {
            pred_filter = pid == 0 ? pid + 1 : pid*2;
        }
    }
}

function refresh() {
    d3.select(`.checked_circle`).remove();
    d3.selectAll('#selected_filter > *').remove();

    // reset filters
    document.getElementById('filter_neg').value = 0;
    document.getElementById('filter_feat').value = -1;
    document.getElementById('filter_val').value = -1;

    // clear selected rule 
    d3.select('#rule_description_selected').html("");
    d3.select('#selected_desp').html("");
    d3.select('#selected_stat g').remove();
    d3.select('.selected_div')
        .style('display', "none");
    lattice_node_selected = -1;
}

d3.select('#submit_reset_filter')
    .on('click', () => {
        selected_filter = {};
        pred_filter = -1;
        refresh()
        generate_rules_after_filtering();
    });


d3.select('#data_submit_reset_filter')
    .on('click', () => {
        data_selected_filter = {};
        pred_filter = -1;
        refresh()
        generate_rules_for_data_filtering();
    })

function generate_rules_after_filtering() {
    postData("filter_rules/", JSON.stringify({
            'feat_filter': selected_filter,
            'pred_filter': pred_filter,
        }), (info) => {
            listData = info['rules'];
            coverage = info['coverage'];
            lattice = info['lattice'];
            preIndex = info['lattice_preIndex'];

            col_order = column_order_by_feat_freq(listData);

            // filter stat
            d3.select('#filter_num_rule').html(listData.length);
            d3.select('#filter_cover').html(`${(coverage*100).toFixed(2)}%`);

            // rule
            tab_rules[0] = listData;

            // rid and graph_node[id]
            rid2rix = {};
            listData.forEach((d, idx) => {
                rid2rix[d['rid']] = idx;
            }) 

            clear();
            construct_lattice();
            render_lattice();
            update_rule_rendering(rule_svg, col_svg, stat_svg, "", listData, col_order);
            render_list();
            render_hierarchical_list();

            render_saved_summary();
        })
}

function generate_rules_for_data_filtering() {
    postData("filter_rules_by_data/", JSON.stringify(data_selected_filter), (info) => {
            listData = info['rules'];
            lattice = info['lattice'];

            col_order = column_order_by_feat_freq(listData);

            // rule
            tab_rules[0] = listData;

            // rid and graph_node[id]
            rid2rix = {};
            listData.forEach((d, idx) => {
                rid2rix[d['rid']] = idx;
            }) 
            construct_lattice();

            update_rule_rendering(rule_svg, col_svg, stat_svg, "", listData, col_order);

            render_lattice();
        })
}

function rule_save() {
    // check whether added
    if (lattice_node_selected in saved_rules) return;

    // add the node/rule 
    saved_rules[lattice_node_selected] = {
        "idx": saved_rules_idx2id.length,
        "text": selected_rule_text
    };
    saved_rules_idx2id.push(lattice_node_selected);

    // update lattice view
    d3.select(`#saved_node-${lattice_node_selected} > text`)
        .text(saved_rules[lattice_node_selected].idx+1);
    d3.select(`#saved_item-${lattice_node_selected} > text`)
        .text(saved_rules[lattice_node_selected].idx+1);

    if (show_saved_node_mark) {
        d3.select(`#saved_node-${lattice_node_selected}`)
            .classed('saved_node_highlight', true)
            .classed('saved_node_hidden', false);

        d3.select(`#saved_item-${lattice_node_selected}`)
            .classed('saved_node_highlight', true)
            .classed('saved_node_hidden', false);
    }

    // update saved rule panel
    let rule_div = d3.select('#rule_list_present')
        .append('div')
        .attr('id', `saved_rule-${lattice_node_selected}`)
        .attr('class', 'filter-summary flex-row')

    rule_div.append('div')
        .attr('class', 'filter-content')
        .html(selected_rule_text);

    rule_div.append('div')
        .attr('class', 'filter-content')
        .html('x')
        .on('click', function() {
                let fix = this.parentNode.id.split('-')[1];
                rule_remove(fix);
                this.parentNode.parentNode.removeChild(this.parentNode);
            });
    render_saved_summary();
}

function rule_remove(node_id) {
    let removed_idx = saved_rules[node_id]['idx'];

    // update this node in lattice view
    if (show_saved_node_mark) {
        d3.select(`#saved_node-${node_id}`)
            .classed('saved_node_highlight', false)
            .classed('saved_node_hidden', true);

        d3.select(`#saved_item-${node_id}`)
            .classed('saved_node_highlight', false)
            .classed('saved_node_hidden', true);
    }
    d3.select(`#saved_node-${node_id} > text`)
        .text("");
    d3.select(`#saved_item-${node_id} > text`)
        .text("");

    delete saved_rules[node_id];
    // update idx and other nodes in lattice view
    saved_rules_idx2id.splice(removed_idx, 1);
    for (let i = removed_idx; i < saved_rules_idx2id.length; i++) {
        saved_rules[saved_rules_idx2id[i]]['idx'] = i;
        d3.select(`#saved_node-${saved_rules_idx2id[i]} > text`)
            .text(i+1);
        d3.select(`#saved_item-${saved_rules_idx2id[i]} > text`)
            .text(i+1);
    }
    // remove rule text in the saved rules panel
    d3.select(`#saved_rule-${node_id}`).remove();

    render_saved_summary();
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
    // rule_svg2.selectAll('.rule_highlight')
    //     .classed('rule_highlight', false);
    // rule_svg3.selectAll('.rule_highlight')
    //     .classed('rule_highlight', false);
    // rule_svg4.selectAll('.rule_highlight')
    //     .classed('rule_highlight', false);

    clicked_g.select('.back-rect')
        .classed('rule_highlight', true);

    let tab_id;
    if (tab_p == '') {
        tab_id = 0;
    } else {
        tab_id = +tab_p - 1;
    }
    // dblclick(id2hierarchy[rule2node[tab_id][rule_idx]]);
    // get_compare_data(listData[rule_idx]['rid']);
    // render_data(rule_idx);
    
    // render_tree_path(listData[rule_idx]['node_id']);

    // highlight lattice path
    d3.selectAll('.lattice_selected')
        .classed('lattice_selected', false)
        .classed('lattice_link', true)

    node_click(rule_idx, rule['rules'].length-1);
    selected_rule_rid = rule_idx;
    selected_rule_cid = rule['rules'].length-1;
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

function generate_tabular_rule(rules) {
    let str = "", cond_str = "";

    let rule_to_show = Array.from(rules['rules']);
    rule_to_show.sort((a, b) => col_order[a['feature']] - col_order[b['feature']]);
    rule_to_show.forEach((d, i) => {
        if (i>0) {
            str += "<br/><b>AND</b> "
            cond_str += ' & '
        } else {
            str += "<b>IF</b> "
        }
        str += `<u>${attrs[d['feature']]}</u>`;
        cond_str += `(df['${attrs[d['feature']]}']`;

        if (d['sign'] !== 'range') {
            if (d['sign'] == '<=') {
                str += "<";
                cond_str += '<';
            } else {
                str += ">=";
                cond_str += '>=';
            }
            str += readable_text(d['threshold']) + " ";
            cond_str += readable_text(d['threshold']) + ")"
        } else {

            str += " from " + readable_text(d['threshold0']) + " to " + readable_text(d['threshold1']) + " ";
            cond_str += `>= ${readable_text(d['threshold0'])} ) & (df['${attrs[d['feature']]}'] < ${readable_text(d['threshold1'])})`
        }
    })

    str += "<b><br/>THEN</b> " + `<span style="color: ${colorCate[rules['label']]}">` + target_names[rules['label']] + "</span>.";
    cond_str += ','
    return [str, cond_str];
}

function readable_text(val) {
    if (val>Math.floor(val) && val<Math.floor(val)+1) {
        return val.toFixed(1)
    } else {
        return val;
    }
}

function showRule(evt, id) {
  // Declare all letiables
  let i, tabcontent, tablinks;

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

  switch (id) {
    case "lattice_content":
        explore_stat['view_click'][0]++;
        break;
    case "overview":
        explore_stat['view_click'][1]++;
        break;
    case "rule_list_content":
        explore_stat['view_click'][2]++;
        break;
    case "rule_hierarchical_list":
        explore_stat['view_click'][3]++;
        break;
  }
}

function change_node_encoding(val) {
    NODE_ENCODING = val;

    update_summary(new_nodes);    
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
    // Declare all letiables
    let i, tabcontent, tablinks;

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

function click_feat_filter(feat_idx) {
    d3.selectAll('#filter_val > *').remove();
    d3.select('#filter_val').selectAll('option')
        .data(d3.range(filter_threshold['num_bin']))
        .enter()
        .append('option')
        .text(d => {
            if (d == 0) 
                return `[${real_min[feat_idx]}, ${real_percentile[feat_idx][0]})`
            else if (d < filter_threshold['num_bin']-1) 
                return `[${real_percentile[feat_idx][d-1]}, ${real_percentile[feat_idx][d]})`
            else 
                return `[${real_percentile[feat_idx][d]}, ${real_max[feat_idx]}]`
        })
}

function export_rule(){
    // Generate download of *.txt file with some content
    let text = "";
    let filename = "rule_export.txt";

    Object.keys(saved_rules).forEach((id) => {
        if (id=="max_idx") return;
        text += saved_rules[id];
        text += "\n";
    });

    let element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

function handleCheck(evt) {
    if (evt.checked) {
        Object.keys(saved_rules).forEach(node_id => {
            d3.select(`#saved_node-${node_id}`)
                .classed('saved_node_highlight', true)
                .classed('saved_node_hidden', false);
        });
        show_saved_node_mark = true;
    } else {
        d3.selectAll('.saved_node_highlight')
            .classed('saved_node_highlight', false)
            .classed('saved_node_hidden', true);
        show_saved_node_mark = false;
    }
}

function click_operation_stat() {
    d3.select('#explore_stat > p').remove();

    d3.select('#explore_stat')
        .append('p')
        .html(`#regenerate_rules: ${explore_stat['regeneration']} <br> 
            #view_click: ${explore_stat['view_click']}`)
    d3.select("#operation_record")
        .style("display", "block");
}
