function render_list() {
    d3.selectAll('#rule_list > *').remove();

    update_list();
}

function update_list() {
    let y_offset = 0,
        x_offset = 60,
        indent = 30,
        rule_offset = 0;

    let list_height = (1+listData.length) * (glyphCellHeight + rectMarginTop + rectMarginBottom) + 10;;
    

    let list_svg = d3.select('#rule_list')
        .attr('height', list_height) 
        .attr('transform', `translate(10, 20)`)
        
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
            hover_text_rule(d3.select(this));
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
    let longest_rule = 0,
        val_des = ['L', 'M', 'H'];

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

    // content 
    rule_g.selectAll('.content').data((d, r_i) => {
        let text_arr = [];
        text_arr.push({
            'content': "IF",
            "x": indent,
            'fill': "black",
            "fontWeight": "bold",
        });

        let x_offset = ctx.measureText("IF ").width + indent;
        // conditions
        conditions = d['rules'];
        if (col_order !== undefined) {
            conditions.sort((a, b) => {
                return col_order[a['feature']] - col_order[b['feature']]
            })
        }

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

            content += " = ";
            rule['range'].forEach((d, i) => {
                if (i>0) {
                    content += " or ";
                }
                content+=val_des[d];
            });

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

function hover_text_rule(clicked_g) {
    // highlight the rule in the rule view
    clicked_g.select('.back-rect')
        .classed('rule_hover', true);
}

function text_rule_unhover() {
    d3.selectAll('.rule_hover')
        .classed('rule_hover', false);
}

function click_text_rule(clicked_g, rule_idx, rule, ) {
    console.log("click on rule", rule_idx);

    // highlight lattice path
    d3.selectAll('.lattice_selected')
        .classed('lattice_selected', false)
        .classed('lattice_link', true)

    node_click(rule_idx, rule['rules'].length-1);
    selected_rule_text = generate_rule_plain_text(rule_idx, rule['rules'].length-1);
    selected_rule_rid = rule_idx;
    selected_rule_cid = rule['rules'].length-1;
}