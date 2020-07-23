let BAR = true, MOSAIC = false;
let clicked_rule_idx = -1;

function update_rule_rendering(rule_svg, col_svg, stat_svg, idx, listData, row_order,) 
{
    // remove the column lines and the outdated rules
    rule_svg.selectAll(".grid-col").remove();
    rule_svg.selectAll(".grid-row").remove();
    rule_svg.selectAll(".column").remove();
    rule_svg.selectAll(".row").remove();
    rule_svg.selectAll("defs").remove();

    // re-render column lines
    height = listData.length * (glyphCellHeight + rectMarginTop + rectMarginBottom) + margin.top + margin.bottom;
    rule_svg
        .attr("width", width + margin.right + margin.left)
        .attr("height", height + margin.top + margin.bottom);

    d3.select(`#rule_div${idx} div`)
        .style("height", `${height + margin.bottom}px`)

    d3.select(`#rule_svg${idx}`)
        .attr("height", height + margin.bottom);

    d3.select(`#stat_div${idx} div`)
        .style("height", `${height + margin.bottom}px`);

    // scale for placing cells
    let yScale = d3.scaleBand().domain(d3.range(listData.length+1))
        .range([margin.top, height]),
        tab_idx = idx !== "" ? idx-1 : 0;

    render_feature_names_and_grid(stat_legend, rule_svg, col_svg, stat_svg, idx, col_order);

    // render by rows
    let row = rule_svg.selectAll(".row")
        .data(listData)
        .enter().append("g")
        .attr("class", "row")
        .attr("id", (d, i) => `ruleg-${idx}-${i}`)
        .attr("transform", function(d, i) { 
            if (row_sorted[tab_idx]) {
                return `translate(${rectMarginH}, ${yScale(row_order[i])+rectMarginTop})`; 
            }
            return `translate(${rectMarginH}, ${yScale(i)+rectMarginTop})`; 
        })
        .on('mouseover', function(d, r_i) {
            hover_rule(d3.select(this), r_i, d, idx);
        })
        .on('mouseout', function(d, r_i) {
            rule_unhover(idx, r_i);
        })
        .on('click', function (d, r_i) {
            if (tab_idx === 0) {
                clicked_rule_idx = r_i;
                click_rule(d3.select(this), r_i, d, idx);
            }
        })
        .on('dblclick', function(d, r_i) {
            d3.select(this).select('.back-rect')
                .classed('rule_highlight', false);
        })

    // render the white background for better click react
    row.append('rect')
        .attr('id', (d, r_i) => `back-rect-${r_i}`)
        .attr('class', 'back-rect')
        .attr('x', -rectMarginH)
        .attr('y', -rectMarginTop)
        .attr('height', `${yScale.bandwidth()}px`)
        .attr('width', `${width-xScale.bandwidth()}px`)
        // .attr('fill', 'white')
        .attr('fill', (d, r_i) => 
            clicked_rule_idx==r_i ? 'rgba(0,0,0,.05)' : 'white'
        );

    if (BAR) {
        // render the horizontal_line
        row.selectAll(".middle")
            .data(function(d) { 
                return d["rules"]; 
            })
            .enter().append("line")
            .attr("class", "middle")
            .attr("x1", function(d) { 
                return xScale(col_order[d["feature"]]) ; 
            })
            .attr("x2", function(d) { 
                return xScale(col_order[d["feature"]])+ glyphCellWidth * 5; 
            })
            .attr("y1", glyphCellHeight/2)
            .attr("y2", glyphCellHeight/2)
            .style("stroke", "lightgrey")
            .style("stroke-width", 1);

        // render the rule ranges
        row.selectAll(".rule-fill")
            .data(d => d["rules"])
            .enter().append("rect")
            .attr("x", function(d) { 
                let xoffset = xScale(col_order[d["feature"]])
                if (d["sign"] === "<=") {
                    return xoffset;
                } else if (d["sign"] === ">") {
                    if (real_min[d["feature"]] == d["threshold"]) {
                        return xoffset + widthScale[d["feature"]](d["threshold"]) + .5;
                    } else 
                        return xoffset + widthScale[d["feature"]](d["threshold"])
                    // return xoffset + widthScale(d["threshold"])

                } else {
                    // return xoffset + widthScale(d["threshold0"])
                    return xoffset + widthScale[d["feature"]](d["threshold0"])
                }
            })
            .attr("width", function(d) {
                let x;
                if (d["sign"] === "<=") {
                    x = widthScale[d["feature"]](d["threshold"]);
                    if (real_max[d["feature"]] == d["threshold"]) {
                        x -= 1.5;
                    }
                } else if (d["sign"] === ">"){
                    x = rectWidth - widthScale[d["feature"]](d["threshold"]);
                    
                } else if (d["sign"] === "range") {
                    x = (widthScale[d["feature"]](d["threshold1"])-widthScale[d["feature"]](d["threshold0"]))
                }
                if (x > 0) return x;
                return 1;
            })
            .attr("y",  0)
            .attr("height", glyphCellHeight)
            .attr("fill", 'dimgray')
    } else if (MOSAIC) {
        row.selectAll(".rule-fill")
            .data(function(d) { 
                var obj = d["rules"];
                to_render = [];
                obj.forEach((rule) => {
                    let feat = rule['feature'];
                    d3.range(filter_threshold['num_bin']).forEach(pdc => {
                        to_render.push({'feature': feat, 
                            'value': pdc, 
                            'show': rule['range'].indexOf(pdc)>=0})
                    })
                })
                return to_render; 
            })
            .enter().append("rect")
            .attr("x", function(d) { 
                return xScale(col_order[d["feature"]]) + rectXst[d['value']]
            })
            .attr("width", function(d) {
                return sqWidth;
            })
            .attr("y",  0)
            .attr("height", glyphCellHeight)
            .attr("fill", d => d['show'] ? "#484848": 'white')
            .attr("stroke", "black");
    } else {
        generate_value_cells(row);
    }

    // grid
    rule_svg.selectAll(".grid-row")
        .data(d3.range(listData.length+1))
        .enter().append("g")
        .attr("class", "grid-row")
        .attr("transform", function(idx) { return `translate(0, ${margin.top + yScale.bandwidth() * idx})`; })
        .append("line")
        .attr("x1", 0)
        .attr("x2", width-xScale.bandwidth())
        .style("stroke", gridColor);

    rule_svg.selectAll(".grid-col")
        .data(xScale.domain())
        .enter().append("g")
        .attr("class", "grid-col")
        .attr("transform", function(d, i) { return `translate(${xScale(i)}, ${margin.top})`; })
        .append("line")
        .attr("y1", 0)
        .attr("y2", yScale(listData.length))
        .style("stroke", gridColor);

    // render_size_circle(listData);
    render_confusion_bars(stat_svg, listData, row_order);

    // re-render compare view
    if (tab_idx==0) {
        render_comparison_bar(comp_svg, "", row_order, same_set_stat)
    } else {
        render_comparison_bar(comp_svg4, 4, row_order, similar_set_stat)
    }
}

function rule_unhover(idx, r_i) {
    d3.select(`.rule_clicked_node`).remove();
    d3.selectAll('.rule_hover')
        .classed('rule_hover', false)

    d3.select('#rule_description').selectAll('p').remove();

    if (idx == '') {
        let source = listData[r_i]['rid'];
        d3.select(`#node-${source}`)
            .style('stroke', 'white')
            .style('stroke-width', '.5px');
        graph_link_dict[source].forEach(target => {
            d3.select(`#link-${source}-${target}`)
                .style('stroke-opacity', '0.2');
        });

        graph_nodes.forEach(node => {
            if (node['id']===source || graph_link_dict[source].indexOf(node['id'])>=0 ) {
                return;
            }
            d3.select(`#node-${node['id']}`)
                .style('fill', colorCate[node['pred']])
                .style('fill-opacity', 1);
        })
    }
}

function generate_value_cells(row,) {
    row.selectAll(".rule-fill")
        .data(d => d['rules'])
        .enter()
        .append("rect")
        .attr("x", (d) => { 
           return  xScale(col_order[d['feature']]) +glyphCellWidth;
        })
        .attr('class', 'rule-fill')
        .attr("width", glyphCellWidth*3)
        .attr("y",  0)
        .attr("height", (glyphCellHeight+rectMarginTop+rectMarginBottom)/5*3)
        .attr("fill", d => {
            // TODO: use real median, preprocessing
            let min = real_min[d['feature']];
            let max = real_max[d['feature']];
            if (d['sign'] == '<=') {
                max = d['threshold'];
            } else if (d['sign'] == '>') {
                min = d['threshold']
            } else {
                min = d['threshold0'];
                max = d['threshold1'];
            }
            let med = (min + max) / 2;
            return colorScale[d['feature']](med);
        })
}

function generate_cells(row) {
    // render the rule ranges
    row.selectAll(".rule-fill")
        .data(function(d) { 
            let arr = [];
            d['rules'].forEach((rule, i) => {
                let idx = rule['feature'];
                for (let j = 0; j <=2; j++) {
                    arr.push({'feature': idx, 'range_idx': j, 'covered': (j>=rule['threshold0'] && j<=rule['threshold1'])});
                }
            });
            return arr;
        })
        .enter()
        .append("rect")
        .attr("x", (d) => { 
           return  xScale(col_order[d['feature']]) + d['range_idx'] * glyphCellWidth + rectMarginH;
        })
        .attr("width", glyphCellWidth)
        .attr("y",  0)
        .attr("height", glyphCellHeight)
        .attr('stroke', 'black')
        .attr("fill", (d) => d['covered'] ? 'dimgray' : 'white')
}

function render_comparison_bar(comp_svg, idx, row_order, compare_data) {
    comp_svg.selectAll('g').remove();

    if (clicked_rule_idx < 0) return;
    
    height = compare_data.length * (glyphCellHeight + rectMarginTop + rectMarginBottom) + margin.top + margin.bottom;
    
    // scale for placing cells
    let yScale = d3.scaleBand().domain(d3.range(compare_data.length+1))
        .range([margin.top, height]),
        tab_idx = idx !== "" ? idx-1 : 0;

    comp_svg.style('height', height);

    let row = comp_svg.selectAll(".row")
        .data(compare_data)
        .enter().append("g")
        .attr("class", "support")
        .attr("transform", function(d, i) { 
            if (row_sorted[tab_idx]) {
                return `translate(0, ${yScale(row_order[i])+rectMarginTop})`; 
            }
            return `translate(0, ${yScale(i)+rectMarginTop})`; 
        })

    let rectHeight = glyphCellHeight;
    // back-rect
    row.append('rect')
        .attr('id', (d, r_i) => `comp${idx}-back-rect-${r_i}`)
        .attr('class', 'back-rect')
        .attr('x', -rectMarginH)
        .attr('y', -rectMarginTop)
        .attr('height', `${yScale.bandwidth()}px`)
        .attr('width', `${width-xScale.bandwidth()}px`)
        .attr('fill', 'white');

    row.append('rect')
        .attr('x', 5)
        .attr('fill', 'white')
        .attr('stroke', 'black')
        .attr('width', compWidth-10)
        .attr('height', rectHeight);

    let tot = d3.sum(node_info[0]['value']),
        widthScale = d3.scaleLinear().domain([0, tot]).range([5, compWidth-5])

    row.selectAll(".compare-fill")
        .data(d => {
            let temp = [];
            // intersection
            temp.push({'x': widthScale(0), 'width': widthScale(d.same)-5, 
                // 'color': '#636363'
                'color': '#cccccc'
            });

            // // target_unique
            // temp.push({'x': widthScale(d.same), 
            //     'width': widthScale(d.target_unique)-5,
            //     'color': '#969696'});

            // // rule unique
            // temp.push({'x': widthScale(d.same+d.target_unique), 
            //     'width': widthScale(d.rule_unique)-5,
            //     'color': '#cccccc'});
            return temp;
        })
        .enter()
        .append("rect")
        .attr("x", d=>d.x)
        .attr('class', 'compare-fill')
        .attr("width", d=>d.width)
        .attr("y",  0)
        .attr("height", rectHeight)
        .attr("fill", d => d.color);

    // row.append('text')
    //     .attr("x", 10)
    //     .attr("y", rectMarginTop+3)
    //     .style('fill', 'black')
    //     .text(d => d.same);
}


