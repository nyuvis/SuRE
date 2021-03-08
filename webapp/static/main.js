let margin = {top: 0, right: 45, bottom: 5, left: 0},
    feat_name_height = 60,
    col_hist_height = 20,
    column_height = feat_name_height + col_hist_height,
    width = 860 - margin.right - margin.left,
    height;
let overviewWidth = 150;

let folder = "diabetes";

height = 650 - margin.top - margin.bottom;

let radiusRange = [4, 20];
let rectMarginTop = 5, rectMarginBottom = 5, 
    rectXst = [], sqWidth,
    rectMarginH = 7;

let glyphCellWidth = 4, glyphCellHeight = 10;
let rectHeight, rectWidth;
let supportRectWidth = 65, fidelityChartWidth = 50, rule_radius = 7;
let statWidth = supportRectWidth * 2 + fidelityChartWidth * 2+ rule_radius * 2 + 20;
let compWidth = supportRectWidth;

let tot_train;

let rule_svg = d3.select("#rule_svg");

let col_svg = d3.select("#column_svg")
    .style("height", `${column_height}px`)

let stat_svg = d3.select('#stat')
    .style("width", `${statWidth}px`)
    .style("height", `${height + margin.top + margin.bottom}px`);
let comp_svg = d3.select('#compare')
    .style("width", `${compWidth+10}px`)
    .style("height", `${height + margin.top + margin.bottom}px`);


let rule_svg2 = d3.select("#rule_svg2");

let stat_svg2 = d3.select("#stat2")
    .style("width", `${statWidth}px`);
let col_svg2 = d3.select("#column_svg2")
    .style("height", `${column_height}px`);

let rule_svg3 = d3.select("#rule_svg3");
let stat_svg3 = d3.select("#stat3")
    .style("width", `${statWidth}px`);
let col_svg3 = d3.select("#column_svg3")
    .style("height", `${column_height}px`);


let widthScale, radiusScale, xScale, yScale, colorScale, 
    supportScale, fidelityScale, confScale;
let colorBarHeight = 5;
let barHeight = (rectHeight - rectMarginTop - rectMarginBottom) / 2;

let c = document.getElementById("myCanvas");
let ctx = c.getContext("2d");
ctx.font = '14px sans-serif';

let selected_range = [];
let rule_attr_ranges = [];
let rules_to_keep = [];

let selected_rule = -1;

let histogram = [];
let lattice = [];

let param_set = false;

let i = 0,
    duration = 750,
    root,
    listData,
    treeData,
    real_min,
    real_max,
    real_percentile,
    support, true_support, false_support, class_support, tot_data,
    raw_data,
    attrs,
    median,
    node_info,
    max_depth,
    target_names,
    text_rules,
    graph_nodes, graph_links, graph_link_dict; 

let present_rules, tot_rule;

let RULE_MODE = GRADIENT_RULE_VIS;

let added_filters = [];
let pre_order = {};
let rule_similarity = [];
let rid2rix = {};

function loadData() {
    let path = domain + "data/" + folder;

    let to_post = {
        "filter_threshold": filter_threshold,
        "dataname": folder,
        "debug_class": goal_debug,
    }
    if (folder == "user_defined") {
        existing_files = retrieveSave();
        to_post["file_key"] = existing_files[existing_files.length-1];
    }
    saved_rules = {
        'max_idx': -1,
    }

    clear();

    postData("generate_surrogate_rules/", JSON.stringify(to_post), (info) => {
        // remove the progressing
        d3.select('#progress')
            .style("display", "none");

        // reset selected rule, filters
        clicked_rule_idx = -1;
        row_sorted = false;

        // rule_similarity = info['rule_similarity'];
        listData = info['rules'];
        tot_rule = info['tot_rule'];
        mrs_coverage = info['coverage'];
        text_rules = info['text_rules'];
        real_percentile = info["real_percentile"];

        node_info = info['node_info_arr'];
        tot_train = node_info[0]['value'][0] + node_info[0]['value'][1];
        // graph_nodes = info['nodes'];
        // graph_links = info['links'];
        // graph_link_dict = {};
        // graph_nodes.forEach(node => {
        //     graph_link_dict[node['id']] = [];
        // });
        // graph_links.forEach(link => {
        //     graph_link_dict[link['source']].push(link['target']);
        // })
        lattice = info['lattice']
        histogram = info['histogram'];
        let test_content = info['test_content'];

        if (test_content !== undefined) {
            attrs = test_content["columns"];
            raw_data = test_content["data"];
            real_min = test_content["real_min"];
            real_max = test_content["real_max"];
            median = test_content["median"];
            // listData = file2["rule_lists"];
            target_names = test_content["target_names"];
            tot_data = test_content['data'].length;
        } 

        selected_filter = {}
        render();       
    })
}

function clear() {
    d3.select('#rule_description_selected').html("");
    d3.select('#selected_desp').html("");
    d3.select('#selected_stat g').remove();
}

function render() {
    present_rules = listData;
    // summary_nodes = filter_nodes(node_info);
    
    // render_matrix(rule_similarity);

    // adjust width and height
    if (RULE_MODE === MEDIAN_VAL_VIS) {
        glyphCellWidth *= 2;
        rectMarginH = 1;
        rectMarginBottom = 1;
        rectMarginTop = 1;

        width = attrs.length * (glyphCellWidth + rectMarginH);
    } else {
        width = (1+attrs.length) * (glyphCellHeight * filter_threshold['num_bin'] + rectMarginH * 2);
    }

    height = (listData.length+1) * (glyphCellHeight + rectMarginTop + rectMarginBottom)+ margin.top + margin.bottom;

    // scale for placing cells
    xScale = d3.scaleBand().domain(d3.range(attrs.length+1))
        .range([0.5, width]);
    yScale = d3.scaleBand().domain(d3.range(listData.length+1))
        .range([0.5, height-margin.bottom]);
    summary_size_ = d3.scaleLinear()
        .domain([filter_threshold['support'] , tot_train])
        .range([5, 35]);

    scroll_functions(width, height, "");
    scroll_functions(width, height, 4);
    scroll_data(width, height);

    // scale for render the support bar
    fidelityScale = d3.scaleLinear().domain([0, 1])
        .range([0, fidelityChartWidth]);
    confScale = d3.scaleLinear().domain([0, 1])
        .range([0, supportRectWidth]);
    // scale for filling rule ranges
    // rectHeight = yScale.bandwidth() - rectMarginTop - rectMarginBottom;

    if (BAR) {
        rectWidth = glyphCellWidth * 5;
        sqWidth = rectWidth / filter_threshold['num_bin'];
    } else {
        sqWidth = glyphCellHeight;
        rectWidth = sqWidth * filter_threshold['num_bin'];
    }
    rectHeight = glyphCellHeight;
    
    rectXst = [];
    d3.range(filter_threshold['num_bin']).forEach(d => {
        rectXst.push(d * sqWidth)
    });

    widthScale = [];
    colorScale = [];

    attrs.forEach((d, i) => {
        widthScale.push(d3.scaleLinear()
            .range([0, rectWidth])
            .domain([real_min[i], real_max[i]]));
    });

    // render_slider();

    switch (RULE_MODE) {
        case BAND_RULE_VIS:
            generate_band_bars(listData);
            break;
    }

    render_legend_label("#legend1");
    // render_summary(summary_nodes, max_depth);

    present_rules = listData;
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
    d3.select("#rule-num")
        .text(`${listData.length}/ ${tot_rule} (data coverage: ${(mrs_coverage*100).toFixed(2)}%)`);
  
    initialize_filters();

    render_lattice();
    render_list();
}

function initialize_filters() {
    // clear
    d3.selectAll('.feat4filter').remove()
    d3.selectAll('.feat4filter_default').remove()
    d3.selectAll('.featval4filter').remove()
    d3.selectAll('.featval4filter_default').remove()
    d3.selectAll('.filter-summary').remove()

    // rule fiter: feature names
    let filter_feat = d3.select('#filter_feat')
        .attr('value', -1)

    filter_feat.append('option')
        .attr('value', -1)
        .attr('class', 'feat4filter_default')
        .text('-- choose a feature name --')

    let ord_map = {}
    col_order.forEach((d, i) => ord_map[d] = i);
    filter_feat.selectAll('.feat4filter')
        .data(d3.range(attrs.length))
        .enter()
        .append('option')
        .attr('class', 'feat4filter')
        .attr('value', ix => ord_map[ix])
        .text(ix=>attrs[ord_map[ix]]);

    d3.select('#filter_feat').on('change', function() {
        let val = d3.select(this).property('value'),
            selected_feat = val;
        // initialize feature value
        d3.selectAll('.featval4filter').remove();

        let val_options = d3.select('#filter_val')
            .attr('value', -1)

        if (selected_feat < 0) {
            return
        }

        val_options.selectAll('.featval4filter')
            .data(d3.range(filter_threshold['num_bin']))
            .enter()
            .append('option')
            .attr('class', 'featval4filter')
            .attr('value', (d,i)=>i)
            .text((d, i) => {
                if (i == 0) {
                    return `[${real_min[selected_feat]}, ${real_percentile.percentile_table[i][selected_feat]})`
                } else if (i == filter_threshold['num_bin']-1) {
                    return `[${real_percentile.percentile_table[i-1][selected_feat]}, ${real_max[selected_feat]}]`
                } else {
                    return `[${real_percentile.percentile_table[i-1][selected_feat]}, ${real_percentile.percentile_table[i][selected_feat]})`
                }
            })

        select_filter(selected_feat, -1);
    })
        
    // rule filter: feature values
    d3.select('#filter_val')
        .append('option')
        .attr('value', -1)
        .attr('class', 'featval4filter_default')
        .text('-- any value --')

    d3.select('#filter_val')
        .on('change', function() {
            let feat_ix = d3.select('#filter_feat').property('value'),
                val_ix = d3.select('#filter_val').property('value');
            if (feat_ix >= 0) {
                select_filter(feat_ix, val_ix)
            }
        })

    // data filter: feature names
    let data_filter_feat = d3.select('#data_filter_feat')
        .attr('value', -1)

    data_filter_feat.append('option')
        .attr('value', -1)
        .attr('class', 'feat4filter_default')
        .text('-- choose a feature name --')

    data_filter_feat.selectAll('.feat4filter')
        .data(d3.range(attrs.length))
        .enter()
        .append('option')
        .attr('class', 'feat4filter')
        .attr('value', ix => ord_map[ix])
        .text(ix=>attrs[ord_map[ix]]);

    d3.select('#data_filter_feat').on('change', function() {
        let val = d3.select(this).property('value'),
            selected_feat = val;
        // initialize feature value
        d3.selectAll('.featval4filter').remove();

        let val_options = d3.select('#data_filter_val')
            .attr('value', -1)

        if (selected_feat < 0) {
            return
        }

        val_options.selectAll('.featval4filter')
            .data(d3.range(filter_threshold['num_bin']))
            .enter()
            .append('option')
            .attr('class', 'featval4filter')
            .attr('value', (d,i)=>i)
            .text((d, i) => {
                if (i == 0) {
                    return `[${real_min[selected_feat]}, ${real_percentile.percentile_table[i][selected_feat]})`
                } else if (i == filter_threshold['num_bin']-1) {
                    return `[${real_percentile.percentile_table[i-1][selected_feat]}, ${real_max[selected_feat]}]`
                } else {
                    return `[${real_percentile.percentile_table[i-1][selected_feat]}, ${real_percentile.percentile_table[i][selected_feat]})`
                }
            })

        select_data_filter(selected_feat, -1);
    })

    // data filter: feature values
    d3.select('#data_filter_val')
        .append('option')
        .attr('value', -1)
        .attr('class', 'featval4filter_default')
        .text('-- any value --')

    d3.select('#data_filter_val')
        .on('change', function() {
            let feat_ix = d3.select('#data_filter_feat').property('value'),
                val_ix = d3.select('#data_filter_val').property('value');
            if (feat_ix >= 0) {
                select_data_filter(feat_ix, val_ix)
            }
        })
}

function scroll_functions(width, height, idx) {
    // d3.select(`#column_div${idx}`)
    //     .style("margin-left", `${statWidth}px`);
    render_stat_legend(d3.select(`#stat_legend${idx}`), 
        d3.select(`#rule_svg${idx}`), 
        d3.select(`#col_svg${idx}`), 
        d3.select(`#stat${idx}`), idx);

    d3.select(`#rule_div${idx} div`)
        .style("height", `${height + margin.bottom}px`)
        .style("width", `${margin.left + width + margin.right}px`);

    d3.select(`#rule_svg${idx}`)
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.bottom);

    d3.select(`#column_div${idx} div`)
        .style("width", `${margin.left + width + margin.right}px`);

    d3.select(`#column_svg${idx}`)
        .style("width", `${margin.left + width + margin.right}px`);

    d3.select(`#stat_div${idx} div`)
        .style("height", `${height + margin.bottom}px`);

    d3.select(`#stat${idx}`)
        .attr("height", height + margin.bottom);

    d3.select(`#rule_div${idx}`).on('scroll', function () {
        document.getElementById(`column_div${idx}`).scrollLeft = this.scrollLeft;

        document.getElementById(`stat_div${idx}`).scrollTop = this.scrollTop;
    });

    d3.select(`#column_div${idx}`).on('scroll', function () {
        document.getElementById(`rule_div${idx}`).scrollLeft = this.scrollLeft;
    });

    d3.select(`#stat_div${idx}`).on('scroll', function () {
        document.getElementById(`rule_div${idx}`).scrollTop = this.scrollTop;
    });
}

function scroll_data(width, height,) {
    d3.select(`#column_div5 div`)
        .style("height", `${column_height}px`)
        .style("width", `${margin.left + width + margin.right}px`);

    d3.select(`#column_svg5`)
        .style("height", `${column_height}px`)
        .style("width", `${margin.left + width + margin.right}px`);


    d3.select(`#column_div5`).on('scroll', function () {
        document.getElementById(`data-table`).scrollLeft = this.scrollLeft;
    });

    d3.select(`#data-table`).on('scroll', function () {
       document.getElementById(`column_div5`).scrollLeft = this.scrollLeft;
       document.getElementById(`data-pred`).scrollTop = this.scrollTop;
    });

    d3.select(`#data-pred`).on('scroll', function () {
        document.getElementById(`data-table`).scrollTop = this.scrollTop;
    }); 
}

function render_feature_names_and_grid(stat_legend, rule_svg, column_svg, stat_svg, tab_id, col_order) {
    column_svg.selectAll(".column").remove();
    column_svg.selectAll(".hist").remove();

    let tab_idx = tab_id=="" ? 0 : tab_id-1;

    let column = column_svg.selectAll(".column").data(attrs)
        .enter().append("g")
        .attr("class", `column`)
        .attr("id", (d, i) => `coltitle-${tab_idx}-${i}`)
        .attr("transform", function(d, i) { 
            return `translate(${xScale(col_order[i])+rectMarginH}, 
            ${feat_name_height+yScale(0)-font_size})rotate(330)`; });

    column.append("text")
        .attr("x", 6)
        .attr("y", yScale.bandwidth() / 1.5 - 5)
        .attr("dy", ".32em")
        .attr("text-anchor", "start")
        .text((d) => {
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
        .text(d => d)

    column.append('rect')
        .classed('unselected-stat', true)
        .classed('mask', true)
        .attr('x', 5)
        .attr('width', feat_name_height * 2 - 30)
        .attr('height', 15);

    column.on('mouseover', function (){
        d3.select(this).select('.mask')
            .classed('unselected-stat', false)
            .classed('highlight-stat', true);
    }).on('mouseout', function() {
        let col_id = d3.select(this)._groups[0][0].id.split('-'),
            tab_idx = parseInt(col_id[1]),
            feat_idx = parseInt(col_id[2]);
        if (row_sorted!=='column' || col_clicked !== feat_idx) {
            d3.select(this).select('.highlight-stat')
                .classed('unselected-stat', true)
                .classed('highlight-stat', false);
        }
    }).on('click', function() {
        let col_id = d3.select(this)._groups[0][0].id.split('-'),
            tab_idx = parseInt(col_id[1]),
            feat_idx = parseInt(col_id[2]);
            
        if (row_sorted!=='column' || col_clicked !== feat_idx) {
            row_sorted = "column";
            row_order = generate_row_order_by_feature(tab_rules[tab_idx], feat_idx, true);
            col_clicked = feat_idx;
            d3.select(`#header${tab_idx+1}`).selectAll('.mask')
                        .classed('highlight-stat', false)
                        .classed('unselected-stat', true);
            d3.select(this).select('.mask')
                .classed('highlight-stat', true)
                .classed('unselected-stat', false)
                .attr('r', rule_radius);   
        } else {
            row_sorted = false;
            col_clicked = false;
            d3.select(this).select('.mask')
                .classed('highlight-stat', false)
                .classed('unselected-stat', true);
        }
        update_rule_rendering(rule_svg, col_svg, stat_svg, tab_id, tab_rules[tab_idx], row_order,)
    });

    let max_hist = d3.max(histogram, (d) => d3.max(d['hist']));

    let y = d3.scaleLinear().domain([0, max_hist])
        .range([ 0, col_hist_height]);
    let x = d3.scaleLinear().domain([0, histogram[0]['hist'].length])
        .range([0, rectWidth]);

    let histEnter = column_svg.selectAll(".hist")
        .data(histogram)
        .enter()
        .append('g')
        .attr('class', 'hist')
        .attr('transform', (d,i) => 
            `translate(${xScale(col_order[i]) + rectMarginH}, ${feat_name_height})`);

    stepWidth = rectWidth / 10;
    histEnter.selectAll('.hist_rect')
        .data(d=> d['hist'])
        .enter()
        .append('rect')
        .attr('class', 'hist_rect')
        .style('x', (d, i) => i * stepWidth)
        .style('y', d => col_hist_height - y(d))
        .style('width', stepWidth)
        .style('height', d => y(d))
        .style('fill', 'darkgrey');
    histEnter.append('line')
        .attr('x1', 0)
        .attr('x2', rectWidth)
        .attr('y1', col_hist_height)
        .attr('y2', col_hist_height)
        .style('stroke', 'darkgrey')
}

function render_slider() {
    let slider_accuracy = d3
        .sliderHorizontal()
        .min(0)
        .max(100)
        .step(1)
        .width(overviewWidth)
        .default([0, 100])
        .fill('#2196f3')
        .on('drag', val => {
            // change the text
            d3.select('#accuracy-text').text(`Accuracy: ${val.map(d => d3.format('.2%')(d/100)).join('-')}`);
            // filter the nodes
            filter_threshold['accuracy'] = [+val[0]/100, +val[1]/100];
            new_nodes = filter_nodes(node_info,);
            if (SUMMARY_LAYOUT !== 'tree') {
                update_summary(new_nodes);
            }
        })
        .on('end', val => {
            // change the text
            d3.select('#accuracy-text').text(`Accuracy: ${val.map(d => d3.format('.2%')(d/100)).join('-')}`);
            // filter the nodes
            filter_threshold['accuracy'] = [+val[0]/100, +val[1]/100];
            update_rules();
            update_legend();
        })
 
    d3.select('#slider-accuracy')
        .append('svg')
        .attr('width', overviewWidth*1.2)
        .attr('height', 50)
        .append('g')
        .attr('transform', 'translate(15,10)')
        .call(slider_accuracy);

    filter_threshold['num_feat'] = attrs.length;
    let slider_feat = d3
        .sliderHorizontal()
        .min(0)
        .max(attrs.length)
        .step(1)
        .width(overviewWidth)
        .default(attrs.length)
        .fill('#2196f3')
        .on('drag', val => {
            // change the text
            d3.select('#feat-text').text(`Max Number of Features: ${val}`);
            // filter the nodes
            filter_threshold['num_feat'] = +val;
            // depth is used when num_feat is not defined
            filter_threshold['depth'] = +val;
            new_nodes = filter_nodes(node_info,);
            if (SUMMARY_LAYOUT !== 'tree') {
                update_summary(new_nodes);
            }
        })
        .on('end', val => {
            // change the text
            d3.select('#feat-text').text(`Max Number of Features: ${val}`);
            // filter the nodes
            filter_threshold['num_feat'] = +val;
            // depth is used when num_feat is not defined
            filter_threshold['depth'] = +val;
            update_rules();
            update_legend();
        });
 
    d3.select('#slider-feat')
        .append('svg')
        .attr('width', overviewWidth*1.2)
        .attr('height', 50)
        .append('g')
        .attr('transform', 'translate(15,10)')
        .call(slider_feat);
}

function update_rules() {
    console.log("update");

    new_nodes = filter_nodes(node_info);
    find_leaf_rules(new_nodes, node_info, listData, 0);   
    // update_summary(new_nodes);
}

function prune_nodes() {
    let support_val, fidelity_val, number_val; 
    d3.select('#support_val')
        .attr('value', function() {
            support_val = this.value;
            return this.value;
        });
    d3.select('#fidelity_val')
        .attr('value', function() {
            fidelity_val = this.value;
            return this.value;
        });
    d3.select('#number_val')
        .attr('value', function() {
            number_val = this.value;
            return this.value;
        });
    support_val = parseFloat(support_val);
    fidelity_val = parseFloat(fidelity_val);
    number_val = parseInt(number_val);

    filter_threshold['support'] = [support_val/100, 1];
    filter_threshold['fidelity'] = [fidelity_val/100, 1];
    // TODO: add threshold for number_val

    // re-render rules
    new_nodes = filter_nodes(node_info,);
    update_summary(new_nodes);
    find_leaf_rules(new_nodes, node_info, 0);
}

function render_confusion_bars(stat_svg, listData, row_order) {
    let yScale = d3.scaleBand().domain(d3.range(listData.length+1))
        .range([margin.top, height]);

    stat_svg.selectAll('.support').remove();

    stat_svg.style('height', `${height}px`)

    let stat_id = stat_svg._groups[0][0].id,
        tab_idx = stat_id.substr(4).length > 0 ? parseInt(stat_id.substr(4))-1 : 0;

    let res = stat_svg.selectAll('g')
        .data(listData)
        .enter()
        .append('g')
        .attr('class', 'support')
        .attr('transform', (d, i)=> {
            let xoff = 0;
            if (tab_idx>0) {
                xoff = -3;
            }
            if (row_sorted) {
                return `translate(${xoff}, ${yScale(row_order[i])})`; 
            }
            return `translate(${xoff}, ${yScale(i)})`; 
        });

    res.append('rect')
        .attr("class", "back-rect")
        .attr('id', (d,i) => `${stat_id}-back-rect-${i}`)
        .attr('height', `${yScale.bandwidth()}px`)
        .attr('width', `${statWidth}px`)
        .attr('fill', 'white');

    let pie = d3.pie()
          .value(function(d) {return d.value; });

    // let circles = res.append("circle")
    //     .attr("class", "label_circle")
    //     .attr("cx", xScale.bandwidth()/2)
    //     // .attr("cx", xScale.bandwidth()/2)
    //     .attr("cy", (d, i) => {
    //         return yScale.bandwidth()/2
    //     })
    //     // .attr("r", d => radiusScale(d["coverage"]))
    //     .attr("r", rule_radius)
    //     .attr("fill", d => colorCate[d["label"]])
    //     .attr("stroke", "none");

    let circles = res.append('g')
        .attr('transform', `translate(${20}, ${rectHeight})`)

    circles.selectAll('.label_circle').data(d => {
        let data = {0: d3.sum(node_info[d['node_id']]['conf_mat'][0]), 
            1: d3.sum(node_info[d['node_id']]['conf_mat'][1])}
        return pie(d3.entries(data))
    }).enter()
        .append('path')
        .attr('d', d3.arc()
            .innerRadius(0)
            .outerRadius(rule_radius)
        )
        .classed('label_circle', true)
        .attr('fill', function(d, i){ return colorCate[i] })
        .attr("stroke", "none");

    
    // render the confusion matrix
    let stat_bar = res.selectAll('.label_stat')
        .data((d,i) => {
            let node_id = r2lattice[i][d['rules'].length-1],
                size = confScale.range()[1],
                tot = lattice[node_id]['support'],

            conf_mat = [
                {'name': 'fp', 
                    'x': 0, 
                    'width': lattice[node_id]['conf_mat'][0][1]/tot*size,
                    'fill': 'url(#fp_pattern)', 
                    'value': lattice[node_id]['conf_mat'][0][1], 
                    'ratio': lattice[node_id]['conf_mat'][0][1]/tot, 
                },
                {'name': 'tp', 
                    'x': lattice[node_id]['conf_mat'][0][1]/tot*size, 
                    'width': lattice[node_id]['conf_mat'][0][0]/tot*size,
                    'fill': colorCate[0],
                    'value': lattice[node_id]['conf_mat'][0][0],
                    'ratio': lattice[node_id]['conf_mat'][0][0]/tot, 
                },
                {'name': 'fn', 
                    'x': d3.sum(lattice[node_id]['conf_mat'][0])/tot*size, 
                    'width': lattice[node_id]['conf_mat'][1][0]/tot*size,
                    'fill': 'url(#fn_pattern)',
                    'ratio': lattice[node_id]['conf_mat'][1][0]/tot, 
                    'value': lattice[node_id]['conf_mat'][1][0],
                },
                {'name': 'tn', 
                    'x': (d3.sum(lattice[node_id]['conf_mat'][0])+lattice[node_id]['conf_mat'][1][0])/tot*size, 
                    'width': lattice[node_id]['conf_mat'][1][1]/tot*size,
                    'fill': colorCate[1],
                    'value': lattice[node_id]['conf_mat'][1][1],
                    'ratio': lattice[node_id]['conf_mat'][1][1]/tot, 
                },
            ];
            return conf_mat;
        }).enter()
        .append('g')
        .attr('class', 'label_stat')
        .attr('transform', `translate(30, ${yScale.bandwidth()/4})`);

    stat_bar.append('rect')
        .attr('x', d => d.x)
        .attr('y', d => 0)
        .attr('width', d => d.width)
        .attr('height', d => glyphCellHeight)
        .attr('fill', d => d.fill)
        .append('title')
            .text(d => d.value)

    stat_bar.append('text')
        .attr('x', d => d.x+2)
        .attr('y', 2 + glyphCellHeight /2)
        .attr('fill', 'white')
        .text(d => d.ratio > .2 ? d.value : "")

    // overall support
    let xoffset = 30 + supportRectWidth + 10;
    let max_support = d3.max(listData, d => d3.sum(node_info[d['node_id']]['value']))
    let tot_support = d3.sum(node_info[0]['value']);
    supportScale = d3.scaleLinear()
        // .domain([0, max_support])
        // .domain([0, d3.sum(node_info[0]['value'])])
        .domain([0, 1])
        .range([0, supportRectWidth]);

    res.append('rect')
        .attr('class', 'support_bar')
        .attr('x', xoffset)
        .attr("y", yScale.bandwidth()/4)
        .attr('width', supportRectWidth)
        .attr('height', glyphCellHeight)
        .attr('fill', 'white')
        .attr('stroke', 'black')

    res.append('rect')
        .attr('class', 'support_bar')
        .attr('x', xoffset)
        .attr("y", yScale.bandwidth()/4)
        // .attr('width', d => supportScale(d3.sum(node_info[d['node_id']]['value'])))
        .attr('width', d => {
            return supportScale(node_info[d['node_id']]['support'])
        })
        .attr('height', glyphCellHeight)
        .attr('fill', 'lightgrey')
        .attr('stroke', 'black');

    res.append('text')
        .attr('class', 'label1-text')
        .attr("x", xoffset + 10)
        .attr("y", rectMarginTop + glyphCellHeight /2 +2)
        .style('fill', 'black')
        // .text(d => `${d3.sum(node_info[d['node_id']]['value'])}`)
        .text(d => `${Math.floor(node_info[d['node_id']]['support']*tot_support)}`)

    // accuracy
    xoffset += supportRectWidth;
    res.append('text')
        .attr('class', 'label1-text')
        .attr("x", xoffset + 10)
        .attr("y", rectMarginTop + glyphCellHeight /2 +2)
        .style('fill', 'black')
        .text(d => {
            let matched = 0,
                node_id = r2lattice[i][d['rules'].length-1],
                size = confScale.range()[1],
                tot = lattice[node_id]['support'];

            for (let x = 0; x < lattice[node_id]['conf_mat'].length; x++) {
                matched += lattice[node_id]['conf_mat'][x][x];
            }
            node_info[d['node_id']]['accuracy'] = matched / tot;
      
            return `${d3.format('.2%')(node_info[d['node_id']]['accuracy'])}`
        });

    // fidelity
    xoffset += fidelityChartWidth;
    res.append('text')
        .attr('class', 'label1-text')
        .attr("x", xoffset + 10)
        .attr("y", rectMarginTop + glyphCellHeight /2 +2)
        .style('fill', 'black')
        .text(d => `${d3.format('.2%')(node_info[d['node_id']]['fidelity'])}`)

}

function update_column_rendering(svg, col_order) {
    for (let i = 0; i<attrs.length; i++) {
        svg.select(`.col-title-${i}`)
            .attr("transform", ()=> { 
                return `translate(${xScale(col_order[i])}, 
                ${column_height+yScale(0)-font_size*2})rotate(330)`; 
            });    
    }
}

function render_stat_legend(stat_legend, rule_svg, col_svg, stat_svg, tab_id) {
    if (stat_legend.select('g')._groups[0][0] !== undefined) {
        return;
    }

    let tab_idx = tab_id=="" ? 0 : tab_id-1;

    stat_legend.style('height', `${column_height}px`)
        .style('width', tab_idx > 0 ? `${compWidth+statWidth}px`: `${statWidth}px`);


    let rectHeight = glyphCellHeight + rectMarginTop + rectMarginBottom;
 
    // comparison
    if (tab_idx > 0) {
        let row = stat_legend.append("g")
            .attr('class', 'legend')
            .attr("transform", `translate(0, ${column_height-rectHeight+rectHeight/4})`)

        row.append('rect')
            .attr('x', 5)
            .attr('fill', 'white')
            .attr('stroke', 'black')
            .attr('width', compWidth-10)
            .attr('height', glyphCellHeight);

        row.selectAll(".compare-fill")
            .data([
                // {'x': 5, 'width': 15, 'color': '#636363'},
                {'x': 5, 'width': 15, 'color': '#cccccc'},
                // {'x': 20, 'width': 15,'color': '#969696'}, 
                // {'x': 35, 'width': 15,'color': '#cccccc'}
                ])
            .enter()
            .append("rect")
            .attr("x", d=>d.x)
            .attr('class', 'compare-fill')
            .attr("width", d=>d.width)
            .attr("y",  0)
            .attr("height", glyphCellHeight)
            .attr("fill", d => d.color);
        row.append('text')
            .attr("x", 7)
            .attr("y", rectMarginTop+3)
            .style('fill', 'black')
            .text('intersection');
    }


    let res = stat_legend.append('g')
        .attr('class', 'legend')
        // .attr('transform', `translate(${compWidth+10}, ${column_height-rectHeight})`);
        .attr('transform', () => {
            if (tab_idx==0)
                return `translate(${0}, ${column_height-rectHeight})`
            else 
                return `translate(${compWidth+10}, ${column_height-rectHeight})`
        });

    // rule prediction
    let pie = d3.pie()
          .value(function(d) {return d.value; })
    let data_ready = pie(d3.entries({0: 50, 1: 50}))

    let circle_area = res.append('g')
        .attr('id', `stat_legend_circle_${tab_idx}`)
        .attr('transform', `translate(${20}, ${rectHeight/2})`)

    circle_area.selectAll('.rule_pred')
        .data(data_ready)
        .enter()
        .append('path')
        .attr('d', d3.arc()
            .innerRadius(0)
            .outerRadius(rule_radius)
        )
        .classed('rule_pred', true)
        .attr('fill', function(d, i){ return colorCate[i] })
        .attr("stroke", "none");

    circle_area.append('circle')
        .classed('unselected-stat', true)
        .classed('mask', true)
        .attr('r', rule_radius)

    let xoffset = 10 + 20;

    let fill_arr = ['url(#fp_pattern)', colorCate[0], 'url(#fn_pattern)', colorCate[1],],
        text_arr = ['fp', 'tp', 'fn', 'tn'];

    for (let i = 0; i < 4; i++) {
        let conf_g = res.append('g')
            .attr('id', `stat_legend_${tab_idx}_${i}`)
            .attr('transform', `translate(${xoffset+supportRectWidth*i/4}, ${rectHeight/4})`);

        conf_g.append("rect")
            .attr("width", supportRectWidth/4)
            .attr("height", glyphCellHeight)
            .attr("fill", fill_arr[i]);

        // conf_g.append('text')
        //     .attr("x", 2)
        //     .attr("y", rectMarginTop+3)
        //     .style('fill', 'white')
        //     .text(text_arr[i]);

        conf_g.append('rect')
            .classed('mask', true)
            .classed('unselected-stat', true)
            .attr("width", supportRectWidth/4)
            .attr("height", glyphCellHeight);

        conf_g.on('mouseover', function (){
                d3.select(this).select('.mask')
                    .classed('unselected-stat', false)
                    .classed('highlight-stat', true)
                    .style('stroke-width', '1.5px');
            }).on('mouseout', function() {
                let stat_str = d3.select(this)._groups[0][0].id.split('_'),
                    tab_idx = stat_str[2],
                    conf_idx = stat_str[3];
                if (row_sorted!==`conf_${conf_idx}`) {
                    d3.select(this).select('.highlight-stat')
                        .classed('unselected-stat', true)
                        .classed('highlight-stat', false);
                } else {
                    d3.select(this).select('.highlight-stat')
                        .style('stroke-width', '1px');
                }
            }).on('click', function() {
                let stat_str = d3.select(this)._groups[0][0].id.split('_'),
                    tab_idx = stat_str[2],
                    conf_idx = stat_str[3];

                if (row_sorted!==`conf_${conf_idx}`) {
                    row_sorted = `conf_${conf_idx}`;
                    col_clicked = false;
                    row_order = generate_row_order_by_confmat(tab_rules[tab_idx], conf_idx);
                    d3.select(this.parentNode).selectAll('.mask')
                        .classed('highlight-stat', false)
                        .classed('unselected-stat', true);

                    d3.select(this).select('.mask')
                        .classed('highlight-stat', true)
                        .classed('unselected-stat', false)
                        .attr('r', rule_radius);   
                } else {
                    row_sorted = false;
                    d3.select(this).select('.mask')
                        .classed('highlight-stat', false)
                        .classed('unselected-stat', true);
                }
                update_rule_rendering(rule_svg, col_svg, stat_svg, tab_id, tab_rules[tab_idx], row_order,)
            });
    }

    // overall support
    xoffset += supportRectWidth + 10;
   
    let support_g = res.append('g')
        .attr('id', `stat_legend_support_${tab_idx}`)
        .attr('transform', `translate(${xoffset}, ${rectHeight/4})`)

    support_g.append('rect')
        .attr('class', 'support_bar')
        .attr('width', supportRectWidth)
        .attr('height', glyphCellHeight)
        .attr('fill', 'white')
        .attr('stroke', 'black')

    support_g.append('rect')
        .attr('class', 'support_bar')
        .attr('width', supportRectWidth/2)
        .attr('height', glyphCellHeight)
        .attr('fill', 'lightgrey')
        .attr('stroke', 'black');

    support_g.append('text')
        .attr('class', 'label1-text')
        .attr("x", 10)
        .attr("y", rectMarginTop+3)
        .style('fill', 'black')
        .text("support");

    support_g.append('rect')
        .classed('unselected-stat', true)
        .classed('mask', true)
        .attr('width', supportRectWidth)
        .attr('height', glyphCellHeight);

    support_g.on('mouseover', function (){
        d3.select(this).select('.mask')
            .classed('unselected-stat', false)
            .classed('highlight-stat', true);
    }).on('mouseout', function() {
        let stat_id = d3.select(this)._groups[0][0].id,
            tab_idx = parseInt(stat_id[stat_id.length-1]);
        if (row_sorted!=='support') {
            d3.select(this).select('.highlight-stat')
                .classed('unselected-stat', true)
                .classed('highlight-stat', false);
        }
    }).on('click', function() {
        let stat_id = d3.select(this)._groups[0][0].id,
            tab_idx = parseInt(stat_id[stat_id.length-1]);
            
        if (row_sorted!=='support') {
            row_sorted = "support";
            col_clicked = false;
            row_order = generate_row_order_by_key(tab_rules[tab_idx], 'support');
            d3.select(this.parentNode).selectAll('.mask')
                        .classed('highlight-stat', false)
                        .classed('unselected-stat', true);
            d3.select(this).select('.mask')
                .classed('highlight-stat', true)
                .classed('unselected-stat', false)
                .attr('r', rule_radius);   
        } else {
            row_sorted = false;
            d3.select(this).select('.mask')
                .classed('highlight-stat', false)
                .classed('unselected-stat', true);
        }
        update_rule_rendering(rule_svg, col_svg, stat_svg, tab_id, tab_rules[tab_idx], row_order,)
    });

    // accuracy 
    xoffset += supportRectWidth;
    let accuracy_g = res.append('g')
        .attr('transform', `translate(${xoffset}, ${rectHeight/4})`)
        .attr('id', `stat_legend_accuracy_${tab_idx}`)

    accuracy_g.append('text')
        .attr('class', 'label1-text')
        .attr("x", 3)
        .attr('y', rectMarginTop+3)
        .style('fill', 'black')
        .text("accuracy");

    accuracy_g.append('rect')
        .classed('unselected-stat', true)
        .classed('mask', true)
        .attr('x', 3)
        .attr('width', supportRectWidth * .8)
        .attr('height', glyphCellHeight);

    accuracy_g.on('mouseover', function (){
        d3.select(this).select('.mask')
            .classed('unselected-stat', false)
            .classed('highlight-stat', true);
    }).on('mouseout', function() {
        let stat_id = d3.select(this)._groups[0][0].id,
            tab_idx = parseInt(stat_id[stat_id.length-1]);
        if (row_sorted!=='accuracy') {
            d3.select(this).select('.highlight-stat')
                .classed('unselected-stat', true)
                .classed('highlight-stat', false);
        }
    }).on('click', function() {
        let stat_id = d3.select(this)._groups[0][0].id,
            tab_idx = parseInt(stat_id[stat_id.length-1]);
            
        if (row_sorted!=='accuracy') {
            row_sorted = "accuracy";
            col_clicked = false;
            row_order = generate_row_order_by_key(tab_rules[tab_idx], 'accuracy');
            d3.select(this.parentNode).selectAll('.mask')
                        .classed('highlight-stat', false)
                        .classed('unselected-stat', true);
            d3.select(this).select('.mask')
                .classed('highlight-stat', true)
                .classed('unselected-stat', false)
                .attr('r', rule_radius);   
        } else {
            row_sorted = false;
            d3.select(this).select('.mask')
                .classed('highlight-stat', false)
                .classed('unselected-stat', true);
        }
        update_rule_rendering(rule_svg, col_svg, stat_svg, tab_id, tab_rules[tab_idx], row_order,)
    });

    // fidelity 
    xoffset += fidelityChartWidth;
    let fidelity_g = res.append('g')
        .attr('transform', `translate(${xoffset}, ${rectHeight/4})`)
        .attr('id', `stat_legend_fidelity_${tab_idx}`)

    fidelity_g.append('text')
        .attr('class', 'label1-text')
        .attr("x", 7)
        .attr('y', rectMarginTop+3)
        .style('fill', 'black')
        .text("fidelity");

    fidelity_g.append('rect')
        .classed('unselected-stat', true)
        .classed('mask', true)
        .attr('x', 3)
        .attr('width', supportRectWidth * .6)
        .attr('height', glyphCellHeight);

    fidelity_g.on('mouseover', function (){
        d3.select(this).select('.mask')
            .classed('unselected-stat', false)
            .classed('highlight-stat', true);
    }).on('mouseout', function() {
        let stat_id = d3.select(this)._groups[0][0].id,
            tab_idx = parseInt(stat_id[stat_id.length-1]);
        if (row_sorted!=='fidelity') {
            d3.select(this).select('.highlight-stat')
                .classed('unselected-stat', true)
                .classed('highlight-stat', false);
        }
    }).on('click', function() {
        let stat_id = d3.select(this)._groups[0][0].id,
            tab_idx = parseInt(stat_id[stat_id.length-1]);
            
        if (row_sorted!=='fidelity') {
            row_sorted = "fidelity";
            col_clicked = false;
            row_order = generate_row_order_by_key(tab_rules[tab_idx], 'fidelity');
            d3.select(this.parentNode).selectAll('.mask')
                        .classed('highlight-stat', false)
                        .classed('unselected-stat', true);
            d3.select(this).select('.mask')
                .classed('highlight-stat', true)
                .classed('unselected-stat', false)
                .attr('r', rule_radius);   
        } else {
            row_sorted = false;
            d3.select(this).select('.mask')
                .classed('highlight-stat', false)
                .classed('unselected-stat', true);
        }
        update_rule_rendering(rule_svg, col_svg, stat_svg, tab_id, tab_rules[tab_idx], row_order,)
    });
}

function main() {
    d3.select('#progress')
        .style("display", "block");

    loadData();
    param_set = true;
}

main();
