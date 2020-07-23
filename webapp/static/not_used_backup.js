    
    <!-- <p id="f1-text" style="margin-bottom: 1px">F1: 0-100%</p>
          <div id="slider-f1"></div>

          <p id="precision-text" style="margin-bottom: 1px">Precision: 0-100%</p>
          <div id="slider-precision"></div>

          <p id="recall-text" style="margin-bottom: 1px">Recall: 0-100%</p>
          <div id="slider-recall"></div> -->


    let slider_f1 = d3
        .sliderHorizontal()
        .min(0)
        .max(100)
        .marks([0,20,40,60,80,100])
        .step(1)
        .width(overviewWidth*.9)
        .default([0, 100])
        .fill('#2196f3')
        .on('onchange', val => {
            // change the text
            d3.select('#f1-text').text(`F1: ${val.map(d => d3.format('.2%')(d/100)).join('-')}`);
            // filter the nodes
            filter_threshold['f1'] = [+val[0]/100, +val[1]/100];
        });
 
    d3.select('#slider-f1')
        .append('svg')
        .attr('width', overviewWidth)
        .attr('height', 45)
        .append('g')
        .attr('transform', 'translate(15,10)')
        .call(slider_f1);

    let slider_recall = d3
        .sliderHorizontal()
        .min(0)
        .max(100)
        .marks([0,20,40,60,80,100])
        .step(1)
        .width(overviewWidth*.9)
        .default([0, 100])
        .fill('#2196f3')
        .on('onchange', val => {
            // change the text
            d3.select('#recall-text').text(`Recall: ${val.map(d => d3.format('.2%')(d/100)).join('-')}`);
            // filter the nodes
            filter_threshold['recall'] = [+val[0]/100, +val[1]/100];
        });
 
    d3.select('#slider-recall')
        .append('svg')
        .attr('width', overviewWidth)
        .attr('height', 45)
        .append('g')
        .attr('transform', 'translate(15,10)')
        .call(slider_recall);

    let slider_precision = d3
        .sliderHorizontal()
        .min(0)
        .max(100)
        .marks([0,20,40,60,80,100])
        .step(1)
        .width(overviewWidth*.9)
        .default([0, 100])
        .fill('#2196f3')
        .on('onchange', val => {
            // change the text
            d3.select('#precision-text').text(`Precision: ${val.map(d => d3.format('.2%')(d/100)).join('-')}`);
            // filter the nodes
            filter_threshold['precision'] = [+val[0]/100, +val[1]/100];
        });
    d3.select('#slider-precision')
        .append('svg')
        .attr('width', overviewWidth)
        .attr('height', 45)
        .append('g')
        .attr('transform', 'translate(15,10)')
        .call(slider_precision);


function generate_value_cells(listData) {
    render_feature_names_and_grid();
    
    // get the median values


    // render rectangles
    let row = rule_svg.selectAll(".row")
        .data(listData)
        .enter().append("g")
        .attr("class", "row")
        .attr("transform", function(d, i) { return `translate(${rectMarginH}, ${yScale(i)+rectMarginTop})`; });

    row.selectAll(".rule-fill")
        .data(d => d['rules'])
        .enter()
        .append("rect")
        .attr("x", (d) => { 
           return  xScale(d['feature']);
        })
        .attr('class', 'rule-fill')
        .attr("width", glyphCellWidth)
        .attr("y",  0)
        .attr("height", glyphCellHeight)
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

    render_confusion_bars(stat_svg);

}

function generate_band_bars(listData) {
    render_feature_names_and_grid(rule_svg);

    let row = rule_svg.selectAll(".row")
        .data(listData)
        .enter().append("g")
        .attr("class", "row")
        .attr("transform", function(d, i) { return `translate(${rectMarginH}, ${yScale(i)+rectMarginTop})`; });

    // render the horizontal_line
    row.selectAll(".middle")
        .data(function(d) { return d["rules"]; })
        .enter().append("line")
        .attr("class", "middle")
        .attr("x1", function(d) { return xScale(d["feature"]) ; })
        .attr("x2", function(d) { return xScale(d["feature"])+ glyphCellWidth * 5; })
        .attr("y1", glyphCellHeight/2)
        .attr("y2", glyphCellHeight/2)
        .style("stroke", "lightgrey")
        .style("stroke-width", 1);

    // render the rule ranges
    row.selectAll(".rule-fill")
        .data(function(d) { 
            let arr = [];
            d['rules'].forEach((rule, i) => {
                let idx = rule['feature'];
                if (rule['sign'] == '<=') {
                    arr.push({'feature': idx, 'coverRange': 0})
                    for (let j = 0; j < valueStops[idx].length; j++) {
                        if (rule['threshold'] > valueStops[idx][j]) {
                            arr.push({'feature': idx, 'coverRange': j});
                        } else break;
                    }
                } else if (rule['sign'] == '>'){
                    arr.push({'feature': idx, 'coverRange': valueStops[idx].length})
                    for (let j = valueStops[idx].length-1; j >= 0; j--) {
                        
                        if (rule['threshold'] < valueStops[idx][j]) {
                            arr.push({'feature': idx, 'coverRange': j});
                        } else break;
                    }
                } else {
                    let range_start = 0;
                    while (rule['threshold0'] > valueStops[idx][range_start]
                        && range_start < 4) {
                        range_start++;
                    }

                    let range_end = valueStops[idx].length;
                     while (rule['threshold1'] < valueStops[idx][range_end]
                        && range_start > 0) {
                        range_start--;
                    }

                    for (let j = range_start; j < range_end; j++) {
                        arr.push({'feature': idx, 'coverRange': j});
                    }
                }
            });
            return arr;
        })
        .enter()
        .append("rect")
        .attr("x", (d) => { 
           return  xScale(d['feature']) + d['coverRange'] * glyphCellWidth;
        })
        .attr("width", glyphCellWidth)
        .attr("y",  0)
        .attr("height", glyphCellHeight)
        .attr("fill", (d) => colorDiv5[d['coverRange']])

    render_confusion_bars(stat_svg);
    // render_data_table();
}


function render_feature_ranges() {
    let feat_selection = d3.select('#feature-ranges');
    ctx.font= "12 sans-serif";

    attrs.forEach((d, i) => {
        let feat_r = feat_selection.append('div')
            .attr('class', 'range')
            .style('margin', '5px')
        let textLength = ctx.measureText(d).width;
        let text = d;
        let txt = d;
        while (textLength > 90) {
            text = text.slice(0, -1);
            textLength = ctx.measureText(text+'...').width;
            txt = text+'...';
        }
        feat_r.append('div')
            .append('span')
            .text(txt);

        let band = feat_r.append('svg')
            .attr('class', 'rangeband')
            .attr('width', 5 * (2 * glyphCellWidth + 2))
            .attr('height', glyphCellHeight + 2 * 2)
            .style("margin-left", "10px");
        let range_clicked = []
        d3.range(0,5).forEach((idx) => {
            range_clicked.push(0);
            band.append('rect')
                .attr('id', `range-${i}-${idx}`)
                .style('x', idx * (glyphCellWidth * 2 + 2))
                .style('y', 2)
                .attr('width', glyphCellWidth * 2)
                .attr('height', glyphCellHeight)
                .style('fill', colorDiv5[idx])
                .style('stroke', borderColor[0])
                .style('stroke-width', 2)
                .on('click', function() {
                    let attr_idx = this.id.split('-')[1];
                    let range_idx = this.id.split('-')[2];
                    selected_range[attr_idx][range_idx] = 1 - selected_range[attr_idx][range_idx];
                    this.style.stroke = borderColor[selected_range[attr_idx][range_idx]];

                    // update the rule view 
                    
                });
        })
        selected_range.push(range_clicked);
    });

}




function update_stat(node_info) {
  let view = d3.select('#summary_view')

  render_x_ticks();

  view.selectAll('.rule-node').remove();

  nodes = view.selectAll('.rule-node')
      .data(node_info)
      .enter()
      .append('g')
      .attr("id", d => `node-${d['node_id']}`)
      .attr('class', 'rule-node')
      .attr('transform', d => `translate(${X_POS == 'fidelity' ? summary_x(d['fidelity']) : summary_x(d['accuracy'])}, ${summary_y(d['depth'])})`)
      .on('click', d => {
        click_summary_node(d['node_id'])
      });

  nodes.append('title')
      .text(d=>`Support: ${d3.format('.2%')(d['support'])}, ${d3.sum(d['value'])};
        Fidelity: ${d['fidelity']};\nAccuracy: ${d['accuracy']}
        NodeID: ${d['node_id']}; Rule index: ${node2rule[d['node_id']]}`)
  
  switch (NODE_ENCODING) {
      case "accuracy":
        nodes.append('circle')
          .attr('r', d => summary_size(d['support']))
          .attr('stroke', 'none')
          .attr('fill', d => summary_color(d['accuracy']))
          .attr('fill-opacity', .8)
          .attr("stroke", d => {
            return node2rule[d['node_id']] !== undefined ? 'black' : 'none';
          })
        break;
      case "fidelity":
        nodes.append('circle')
          .attr('r', d => summary_size(d['support']))
          .attr('stroke', 'none')
          .attr('fill', d => fidelity_color(d['fidelity']))
          .attr('fill-opacity', .8)
          .attr("stroke", d => {
            return node2rule[d['node_id']] !== undefined ? 'black' : 'none';
          });
        break;
      case "purity":
        nodes          
          .selectAll('path')
          .data(node => {
             let ready = pie(node['value'])
             ready.forEach(part => part['support'] = node['support']);
             return ready;
          }).enter()
          .append("path")
          .attr('d', d => d3.arc()
            .innerRadius(0)
            .outerRadius(summary_size(d['support']))(d)
          )
          .attr('fill', (d, i) => colorCate[i])
          .attr("stroke", "none");    
        break;      
    }
}

function render_x_ticks() {
  x_axis.scale(summary_x);

  summary_x_tick
    .transition()
    .duration(500)
    .call(x_axis);
}



    // prepare ranges for rendering
    let filtered_data = {};
    listData.forEach((d) => {
        d['rules'].forEach((rule, row_idx) => {
            let left, right;
            if (rule['sign'] == 'range') {
                left = rule['threshold0'];
                right = rule['threshold1'];
            } else if (rule['sign'] == '<=') {
                left = real_min[rule['feature']];
                right = rule['threshold'];
            } else if (rule['sign'] == '>') {
                left = rule['threshold'];
                right = real_max[rule['feature']];
            } else {
                console.log('invalid rule');
            }
            left = left.toFixed(1);
            right = right.toFixed(1);
            let id = `range-${rule['feature']}-${left}-${right}`
            id = id.replace(/\./g, '_');

            let currentObj = filtered_data[id] || {
                'id': id,
                'row': row_idx,
                'feature': rule['feature'],
                'start': left,
                'end': right,
            }
            filtered_data[id] = currentObj;

            rule['id'] = id; 
        })
    });
    filtered_data = Object.keys(filtered_data).map((d) => filtered_data[d]);

    // define linear gradients
    let linear_gradient = rule_svg.append('defs')
        .selectAll('.linear_gradient')
        .data(filtered_data).enter()
        .append('linearGradient')
      .attr('class','linear_gradient')
      .attr('id', function(d) {
        return "linear-gradient-" + d.id;
      })
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    linear_gradient.append('stop')
      .attr('class','linear_gradient_start')
      .attr('offset', '0%')
      .attr('stop-color', function(d){
        return colorScale[d.feature]( +d.start );
      });

    linear_gradient.append('stop')
      .attr('class','linear_gradient_end')
      .attr('offset', '100%')
      .attr('stop-color', function(d){
        return colorScale[d.feature]( +d.end );
      });