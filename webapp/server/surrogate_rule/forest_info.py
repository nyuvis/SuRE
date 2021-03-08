import numpy as np
import pandas as pd
import copy
from sklearn.metrics.pairwise import cosine_similarity
from scipy.cluster.hierarchy import ward, leaves_list
from scipy.spatial import distance

class Forest():
    def initialize(self, node_info, real_min, real_max, real_percentile, df, y_pred, y_gt, rules, target_names):
        self.node_info = { int(x) : node_info[x] for x in node_info }
        # self.node_info = node_info
        self.real_min = real_min
        self.real_max = real_max
        ranges = np.zeros(shape=(len(real_max), 2))
        ranges[:, 0] = 0
        ranges[:, 1] = real_percentile['num_bin']-1
        self.ranges = ranges
        self.num_bin = real_percentile['num_bin']

        self.has_leaves = []

        self.node_feature_ranges = {int(x): [] for x in node_info}
        self.node_feature_marked = {int(x): False for x in node_info}
        # mark the root node
        self.node_feature_marked[0] = True
        self.node_feature_ranges[0] = copy.deepcopy(ranges)
        self.df = df
        self.y_pred = np.array(y_pred)
        self.y_gt = np.array(y_gt)
        self.rules = rules
        self.target_names = target_names

        self.real_percentile = real_percentile
        self.rep_range = np.zeros(shape=(len(real_min), real_percentile['num_bin'], 2))
        for idx in range(len(real_min)):
            self.rep_range[idx][0] = np.array([real_min[idx], real_percentile['percentile_table'][0][idx]])
            for i in range(real_percentile['num_bin']-2):
                self.rep_range[idx][i+1] = np.array([real_percentile['percentile_table'][i][idx], 
                    real_percentile['percentile_table'][i+1][idx]])
            self.rep_range[idx][self.num_bin-1] = np.array([real_percentile['percentile_table'][self.num_bin-2][idx], real_max[idx]])

    def initialize_histogram(self):
        dist_list = []

        for attr_idx in range(self.df.columns.shape[0]):
            hist = np.histogram(self.df.values[:, attr_idx], bins=10, range=(self.real_min[attr_idx], self.real_max[attr_idx]))
            dist_list.append({
                'hist': hist[0].tolist(),
                'bin_edges': hist[1].tolist(),
        })
        return dist_list

    def initilized_rule_overlapping(self):
        self.rule_overlapping = np.zeros(shape=(len(self.rules), self.num_bin * self.df.columns.shape[0] + 1))
        rid = 0
        for rule in self.rules:
            conds = rule['rules']
            # matched_data = pd.DataFrame(data=self.cate_X, columns=cols)
            for cond in conds:
                col = cond['feature']
                t_idx = col * self.num_bin
                for i in cond['range']:
                    self.rule_overlapping[rid][t_idx+i] = 1
            rid += 1
        self.rule_overlapping[:, -1] = 1

    def initialize_rule_match_table(self):
        cols = self.df.columns
        self.rule_matched_table = np.zeros(shape=(len(self.rules), self.df.shape[0]))
        rid = 0
        for rule in self.rules:
            conds = rule['rules']
            matched_data = pd.DataFrame(self.df)
            # matched_data = pd.DataFrame(data=self.cate_X, columns=cols)
            for cond in conds:
                col = cols[cond['feature']]
                if (cond['sign'] == '<='):  
                    if (cond['threshold'] == self.real_max[cond['feature']] and 
                        cond['threshold']!=self.rep_range[cond['feature']][-1][1]):
                        matched_data = matched_data[matched_data[col] <= cond['threshold']]
                    else:
                        matched_data = matched_data[matched_data[col] < cond['threshold']]
                elif (cond['sign'] == '>'):
                    matched_data = matched_data[matched_data[col] >= cond['threshold']]
                elif (cond['sign'] == 'range'):
                    matched_data = matched_data[(matched_data[col] >= cond['threshold0']) & (matched_data[col] < cond['threshold1'])]
                else:
                    print("!!!!!! Error rule !!!!!!")
            matched_index = matched_data.index.values.astype(int)
            self.rule_matched_table[rid, matched_index] = 1
            rid += 1
        d = distance.pdist(X=self.rule_matched_table, metric='jaccard')
        self.rule_similarity = distance.squareform(d)

    def empty_has_leaves(self):
        self.has_leaves = np.zeros(len(self.node_info))
        self.has_leaves[0] = True

    def trace_back(self, node_id):
        if (self.has_leaves[node_id] or node_id<0):
            return
        parent_id = self.node_info[node_id]['parent']
        self.has_leaves[node_id] = True
        self.trace_back(parent_id)

    def rule_traversal(self, node_id):
        if (self.node_feature_marked[node_id]):
            return self.node_feature_ranges[node_id]
        # recursive process
        parent_id = self.node_info[node_id]['parent']
        self.rule_traversal(parent_id)
        threshold = self.node_info[parent_id]['threshold']
        f_id = self.node_info[parent_id]['feature']

        # update left child, feat < threshold, (val0, min(val1, threshold))
        left = self.node_info[parent_id]['left']
        self.node_feature_ranges[left] = copy.deepcopy(self.node_feature_ranges[parent_id])
        self.node_feature_ranges[left][f_id][1] = np.min([self.node_feature_ranges[left][f_id][1], threshold])
        self.node_feature_marked[left] = True
        # update right child, feat > threshold, (max(val0, threshold), val1)
        right = self.node_info[parent_id]['right']
        self.node_feature_ranges[right] = copy.deepcopy(self.node_feature_ranges[parent_id])
        self.node_feature_ranges[right][f_id][0] = np.max([self.node_feature_ranges[right][f_id][0], threshold])
        self.node_feature_marked[right] = True

    def tree_traversal_limite_depth(self, node_id):
        if (self.node_info[node_id]['depth'] == self.depth_limit):
            self.node_order.append(node_info)
            return
        self.tree_traversal_limite_depth(node_info[node_id]['left'])
        self.tree_traversal_limite_depth(node_info[node_id]['right'])


    def find_leaf_rules(self, new_node_ids):
        self.empty_has_leaves()
        # sort nodes by level, the lower (deeper) ones rank first
        new_nodes = []
        for node_id in new_node_ids:
            new_nodes.append({
                'node_id': node_id,
                'depth': self.node_info[node_id]['depth'],
            });

        sorted_nodes = sorted(new_nodes, key = lambda x: -x['depth'])

        # trace the branches
        leaf_node_ids = []
        for node in sorted_nodes:
            node_id = node['node_id']
            if (self.has_leaves[node_id] != True):
                leaf_node_ids.append(node_id)
                rule = self.trace_back(node_id)

        # convert leaf nodes into rules
        leaf_rules = []
        for leaf_node_id in leaf_node_ids:
            self.rule_traversal(leaf_node_id)
            leaf_rules.append(self.convert2rule(leaf_node_id))

        return leaf_rules

    def find_linked_rules(self, node_id):
        self.rule_traversal(node_id)
        p_id = node_id
        linked_rules = []
        while (p_id > 0):
            linked_rules.append(self.convert2rule(p_id))
            p_id = self.node_info[p_id]['parent']
        linked_rules.reverse()
        return linked_rules

    def find_node_rules(self, node_ids):
        # min_node_id = np.min(node_ids)
        node_rules = []
        for node_id in node_ids:
            self.rule_traversal(node_id)
            node_rules.append(self.convert2rule(node_id))
        return node_rules

    def get_matched_data(self, conditions):
        cols = self.df.columns
        matched_data = pd.DataFrame(self.df)
        for cond in conditions:
            col = cols[cond['feature']]
            if (cond['sign'] == '<='):    
                matched_data = matched_data[matched_data[col] <= cond['threshold']]
            elif (cond['sign'] == '>'):
                matched_data = matched_data[matched_data[col] >= cond['threshold']]
            elif (cond['sign'] == 'range'):
                matched_data = matched_data[(matched_data[col] >= cond['threshold0']) & (matched_data[col] <= cond['threshold1'])]
            else:
                print("!!!!!! Error rule !!!!!!")

        matched_index = matched_data.index.values.astype(int)
        matched_pred = self.y_pred[matched_index]
        matched_gt = self.y_gt[matched_index]
        return {
            'matched_data': matched_data.values.tolist(),
            'matched_pred': matched_pred.tolist(),
            'matched_gt': matched_gt.tolist(),
        }

    def get_rules_by_level(self, depth):
        self.result_nodes = []
        self.get_nodes_by_level(0, depth)
        
        node_rules = self.find_node_rules(self.result_nodes)
        return {"nodes": self.result_nodes, "rule_lists": node_rules}


    def get_nodes_by_level(self, node_id, target_level):
        # print(node_id, self.node_info[node_id]['depth'])
        if (self.node_info[node_id]['depth'] == target_level):
            self.result_nodes.append(node_id)
            return
        if (self.node_info[node_id]['left'] > 0):
            self.get_nodes_by_level(self.node_info[node_id]['left'], target_level)
        if (self.node_info[node_id]['right'] > 0):
            self.get_nodes_by_level(self.node_info[node_id]['right'], target_level)

    def get_histogram(self, selection):
        dist_list = []
        node_list = []
        for node in selection:
            node_id = int(node)
            node_list.append(node_id)
        rule_list = self.find_node_rules(node_list)

        cols = self.df.columns
        matched_data = pd.DataFrame(self.df)
        # matched_data = pd.DataFrame(data = self.cate_X, columns=cols)
        included_index = []
        for rule in rule_list:
            for cond in rule['rules']:
                col = cols[cond['feature']]
                if (cond['sign'] == '<='):    
                    matched_data = matched_data[matched_data[col] <= cond['threshold']]
                elif (cond['sign'] == '>'):
                    matched_data = matched_data[matched_data[col] > cond['threshold']]
                elif (cond['sign'] == 'range'):
                    matched_data = matched_data[(matched_data[col] > cond['threshold0']) & (matched_data[col] <= cond['threshold1'])]
                else:
                    print("!!!!!! Error rule !!!!!!")
            included_index.extend(matched_data.index.values)
            to_exclude = self.df.index.isin(included_index)
            matched_data = pd.DataFrame(self.df)[~to_exclude]

        X = self.df.iloc[included_index].values
        dist_list = []
        print(X.shape)

        for attr_idx in range(len(cols)):
            hist = np.histogram(X[:, attr_idx], bins=10, range=self.ranges[attr_idx])
            dist_list.append({
                'hist': hist[0].tolist(),
                'bin_edges': hist[1].tolist(),
            })
        return dist_list
    
    def get_r_sqaured():
        # calculate R-squared
        leave_pred = estimator.predict(cate_X)
        sse = np.sum((leave_pred - y_svm_)**2)
        sst = np.sum((y_svm_ - y)**2)
        rsqr = 1-sse/sst
        return rsqr
        
    def get_level_rules(depth_limit):
        self.depth_limit = depth_limit
        self.node_order = []
        self.tree_traversal_limite_depth(0)
        rule_list = []
        for node_id in self.node_order:
            rule_list.append(self.convert2rule(node_id))
        return rule_list
        
    def preOrderTraverse(self, root):
        self.preOrder[self.node_info[root]['node_id']] = {'order': self.tot_idx}
        self.tot_idx += 1
        if (self.node_info[root]['right'] > 0):
            self.preOrderTraverse(self.node_info[root]['right'])
        if (self.node_info[root]['left'] > 0):
            self.preOrderTraverse(self.node_info[root]['left'])
        self.preOrder[self.node_info[root]['node_id']]['max_descendant'] = self.tot_idx-1

    def find_the_min_set(self):
        # initialize distance
        # D[i] means how many instances that rule i can cover but are not covered by rules in the targe set
        target_set = []
        D = {i: self.rule_matched_table[i].sum() for i in range(len(self.rules))}
        target_matched_vector = np.zeros(shape=self.df.shape[0])
        target_overlapping = np.zeros(shape=self.df.columns.shape[0] * self.num_bin + 1)
        target_overlapping[-1] = 1

        # find the most differet rule every time, 
        # until all instances are covered, or cannot cover new instances
        go_on = True
        rid = max(D, key=D.get)
        while (go_on):
            target_set.append(rid)
            target_matched_vector = np.logical_or(target_matched_vector, self.rule_matched_table[rid])
            target_overlapping = np.logical_or(target_overlapping, self.rule_overlapping[rid])
            del D[rid]
            if (len(D) == 0):
                go_on = False
            else:
                # update distance to target set
                # D = {key: (np.logical_or(target_matched_vector, self.rule_matched_table[key]).sum() - target_matched_vector.sum()) / self.rule_matched_table[key].sum() for key in D}
                # D = {key: (np.logical_or(target_matched_vector, self.rule_matched_table[key]).sum() - target_matched_vector.sum()) / (np.logical_and(target_overlapping, self.rule_overlapping[key])).sum() for key in D}
                D = {key: (np.logical_or(target_matched_vector, self.rule_matched_table[key]).sum() - target_matched_vector.sum()) for key in D}
                rid = max(D, key=D.get)
                if (D[rid] <= 0):
                    go_on = False

        self.target_set = target_set
        # get the row order by hierarchical clustering
        # self.hierarchy_leaves = self.hierarchical_clustering(target_set)
        # self.rule_ord = self.hierarchy_leaves

        # get thr row order by label
        self.rule_ord = self.get_order_by_label(target_set)

        # get coverage
        coverage = float(target_matched_vector.sum()) / target_matched_vector.shape[0]
        target_rule_set = []
        text_rules = []
        for rule_ord in self.rule_ord:
        # for rule_ord in range(len(target_set)):
            rid = target_set[rule_ord]
            r = self.rules[rid]
            r['rid'] = rid
            # text_rules.append(self.get_rule_text(r))
            target_rule_set.append(r)
        self.target_rule_set = target_rule_set
        return {'rules': target_rule_set, "tot_rule": len(self.rules), "coverage": coverage, "text_rules": text_rules}

    def get_rule_text(self, r):
        rule_str = "If "
        attrs = self.df.columns.values

        for i in range(len(r['rules'])):
            cond = r['rules'][i]
            if (i > 0):
                rule_str += " AND "
            rule_str += attrs[cond['feature']] 
            if (cond['sign'] == 'range'):
                rule_str += " from " + str(cond['threshold0']) + " to " + str(cond['threshold1'])
            elif (cond['sign'] == '<='):
                if cond['range'][-1] == self.num_bin - 1:
                    rule_str += "<=" + str(cond['threshold'])
                else:
                    rule_str += "<" + str(cond['threshold'])
            else:
                rule_str += '>=' + str(cond['threshold'])
        rule_str += ' Then ' + self.target_names[r['label']]
        return rule_str

    def get_order_by_label(self, target_set):
        row_info = []
        row_order = {}

        for i in range(len(target_set)):
            rid = target_set[i]
            row_info.append({
              'idx': i,
              'label': self.rules[rid]['label'],
              'support': self.node_info[self.rules[rid]['node_id']]['support']
            })

        row_info = sorted(row_info, key = lambda x: (x['label'], -x['support']))
        for i in range(len(row_info)):
            row_order[row_info[i]['idx']] = i

        return row_order

    def hierarchical_clustering(self, target_set):
        # construct vectors of rules for clusters
        vectors = []
        for rid in target_set:
            vect = np.ones(shape=self.df.shape[1])
            vect = np.negative(vect) * 2
            for d in self.rules[rid]['rules']:
                vmin = self.real_min[d['feature']]
                vmax = self.real_max[d['feature']]
                # vmin = 0
                # vmax = 2
                if (d['sign'] == '<='):
                    vmax = d['threshold']
                elif (d['sign'] == '>'):
                    vmin = d['threshold']
                else:
                    vmin = d['threshold0']
                    vmax = d['threshold1']
                med = (vmin + vmax) / 2
                val = (med-self.real_min[d['feature']]) / (self.real_max[d['feature']] - self.real_min[d['feature']])
                vect[d['feature']] = val
            vectors.append(vect)
        X = np.array(vectors)
        # clustering
        Z = ward(distance.pdist(X))
        leaves = leaves_list(Z)
        return leaves

    def get_graph_links(self):
        spc_info = []
        link_info = []

        count = 0
        for r_idx in self.target_set:
            spc_info.append({
                'id': r_idx,
                'pred': self.rules[r_idx]['label'],
                'size': int(self.rule_matched_table[r_idx].sum()),
            })
            count += 1
            
        matrix = np.zeros(shape=(len(self.target_set), len(self.target_set)))
        for i_i in range(len(self.target_set)):
            i = self.target_set[i_i]
            for i_j in range(len(self.target_set)):
                # r_i = self.target_set[i]
                # r_j = self.target_set[j]
                j = self.target_set[i_j]
                link = {
                    'source': i,
                    'target': j,
                    'common': float(np.logical_and(self.rule_matched_table[i], self.rule_matched_table[j]).sum())
                }
                if (link['common']>0.0):
                    link['distance'] = float(1-np.logical_and(self.rule_matched_table[i], self.rule_matched_table[j]).sum()/ np.logical_or(self.rule_matched_table[i], self.rule_matched_table[j]).sum()),
                else:
                    link['distance'] = 1
                link_info.append(link)
                # matrix[i_i][i_j] = link['common']
        return {'nodes': spc_info, 'links': link_info}


    def get_compare_data(self, rid):
        # get the most similar rules
        r_info = []
        for rid_1 in range(len(self.rules)):
            r_info.append({
                'rid': rid_1,
                'simi': 1-self.rule_similarity[rid][rid_1]
            })
        r_info = sorted(r_info, key=lambda x: x['simi'], reverse=True)
        top_simi = []

        # check the most similar 20 rules
        upper_bound = min(20, len(r_info))
        for i in range(upper_bound):
            inter = np.logical_and(self.rule_matched_table[rid], self.rule_matched_table[r_info[i]['rid']]).sum()
            # the rules should cover at least 20 instances in common
            if (inter > 20):
                r = self.rules[r_info[i]['rid']]
                r['rid'] = r_info[i]['rid']
                top_simi.append(r)
            else:
                break

        # get the difference b/w this and other rules
        # target and other rules in the min set
        same_set_stat = []
        # for r_id in self.target_set:
        #     
        for rule_ord in self.rule_ord:
            r_id = self.target_set[rule_ord]
            union = np.logical_or(self.rule_matched_table[rid], self.rule_matched_table[r_id]).sum()
            inter = np.logical_and(self.rule_matched_table[rid], self.rule_matched_table[r_id]).sum()
            same_set_stat.append({
                'r_id': r_id,
                'same': int(inter),
                'target_unique': int(self.rule_matched_table[rid].sum() - inter),
                'rule_unique': int(self.rule_matched_table[r_id].sum() - inter),
            })

        # target and other similar rules
        similar_set_stat = []
        for r in top_simi:
            r_id = r['rid']
            union = np.logical_or(self.rule_matched_table[rid], self.rule_matched_table[r_id]).sum()
            inter = np.logical_and(self.rule_matched_table[rid], self.rule_matched_table[r_id]).sum()
            similar_set_stat.append({
                'r_id': r_id,
                'same': int(inter),
                'target_unique': int(self.rule_matched_table[rid].sum() - inter),
                'rule_unique': int(self.rule_matched_table[r_id].sum() - inter),
            })
        return {'top_simi': top_simi, 'same_set_stat': same_set_stat, 'similar_set_stat': similar_set_stat}

    def get_col_order_by_freq(self, rules):
        col_info = []
        col_order = []
        for i in range(len(self.df.columns)):
            col_info.append({
              'idx': i,
              'freq': 0
            })
            col_order.append(i)


        for the_rule in rules:
            r = the_rule['rules']
            for cond in r:
                col_info[cond['feature']]['freq'] += 1

        # sort columns by freq.
        col_info.sort(key=lambda x: x['freq'], reverse=True)
        for i in range(len(col_info)):
            col_order[col_info[i]['idx']] = i

        return col_order

    def get_lattice_structure(self, rules):
        self.lattice_node_max = 0
        self.lattice_leaves = []
        root = 0;
        self.lattice = {0: {'node_id': 0, 'feature': -1, 'threshold': -1, 'sign': -1,
        'parent': -1, 'children_id': [], 'depth': 0}}
        # get column order
        col_order = self.get_col_order_by_freq(rules)

        for the_rule in rules:
            # order conditions
            r = the_rule['rules']
            # r.sort(key=lambda x: col_order[x['feature']])
            # add rule to index tree
            lattice_node, cond_idx = self.find_common_ancestor_lattice(r)
            # update lattice hierarchy
            self.update_subtree_node_lattice(lattice_node, r, cond_idx)

        # initialize prediction/ground_truth contribution
        self.conf_cont = np.zeros(shape=(2,2,self.df.shape[0]))
        self.conf_cont[0,0,:] = self.initialize_bb_gt_contribution(0, 0)
        self.conf_cont[0,1,:] = self.initialize_bb_gt_contribution(0, 1)
        self.conf_cont[1,0,:] = self.initialize_bb_gt_contribution(1, 0)
        self.conf_cont[1,1,:] = self.initialize_bb_gt_contribution(1, 1)

        # calculate support and confusion matrix 
        self.update_lattice_stat(0, np.ones(self.df.shape[0]))
        return self.lattice

    def find_common_ancestor_lattice(self, rule):
        candidate= 0
        cond_idx = 0
        move_on = True
        while (move_on and cond_idx<len(rule)):
            move_on = False
            children = self.lattice[candidate]['children_id']
            for child_idx in range(len(children)):
                if (self.condition_equals(self.lattice[children[child_idx]], rule[cond_idx])):
                    move_on = True
                    candidate = children[child_idx]
                    cond_idx += 1
                    break
        return candidate, cond_idx


    def condition_equals(self, a, b):
        if (a['feature'] == b['feature'] and a['sign'] == b['sign']):
            if (a['sign'] == 'range'):
                return a['threshold0'] == b['threshold0'] and a['threshold1']==b['threshold1']
            else:
                return a['threshold'] == b['threshold']
        return False

    def update_subtree_node_lattice(self, common_ancestor, rule, cond_idx):
        # update common ancestor
        self.lattice[common_ancestor]['children_id'].append(self.lattice_node_max+1)
        
        # update child nodes
        parent_id = common_ancestor
        for idx in range(cond_idx, len(rule)):
            self.lattice_node_max += 1
            new_node = {
                'node_id': self.lattice_node_max,
                'children_id': [],
                'parent': parent_id,
                'feature': int(rule[idx]['feature']),
                'sign': rule[idx]['sign'],
                'depth': int(idx),
            }
            if (new_node['sign']=='range'):
                new_node['threshold0'] = float(rule[idx]['threshold0'])
                new_node['threshold1'] = float(rule[idx]['threshold1'])
            else:
                new_node['threshold'] = float(rule[idx]['threshold'])

            if (idx<len(rule)-1):
                new_node['children_id'].append(self.lattice_node_max+1)
            self.lattice[new_node['node_id']] = new_node
            parent_id = self.lattice_node_max
        self.lattice_leaves.append(self.lattice_node_max)

    def update_lattice_stat(self, node_id, match_vector):
        # update lattice node info
        self.lattice[node_id]['support'] = np.sum(match_vector)
        conf_matrix = np.zeros(shape=(2,2))
        conf_matrix[0][0] = np.sum(np.logical_and(self.conf_cont[0][0], match_vector))
        conf_matrix[0][1] = np.sum(np.logical_and(self.conf_cont[0][1], match_vector))
        conf_matrix[1][0] = np.sum(np.logical_and(self.conf_cont[1][0], match_vector))
        conf_matrix[1][1] = np.sum(np.logical_and(self.conf_cont[1][1], match_vector))
        self.lattice[node_id]['conf_mat'] = conf_matrix.tolist()
        
        # initialize data to be matched
        idx = [i for i, x in enumerate(match_vector) if x>0]
        self.lattice[node_id]['matched_data'] = idx

        if (len(self.lattice[node_id]['children_id'])==0):
            return

        to_match = self.df.iloc[idx]
        cols = self.df.columns
        
        for child in self.lattice[node_id]['children_id']:
             # compare values with condition
            cond = self.lattice[child]
            col = cols[cond['feature']]
            if (cond['sign'] == '<='):  
                if (cond['threshold'] == self.real_max[cond['feature']] and 
                    cond['threshold']!=self.rep_range[cond['feature']][-1][1]):
                    matched_data = to_match[to_match[col] <= cond['threshold']]
                else:
                    matched_data = to_match[to_match[col] < cond['threshold']]
            elif (cond['sign'] == '>'):
                matched_data = to_match[to_match[col] >= cond['threshold']]
            elif (cond['sign'] == 'range'):
                matched_data = to_match[(to_match[col] >= cond['threshold0']) & (to_match[col] < cond['threshold1'])]
            else:
                print("!!!!!! Error rule !!!!!!")
            # update match stat
            matched_index = matched_data.index.values.astype(int)
            new_match_vector = np.zeros(self.df.shape[0])
            new_match_vector[matched_index] = 1
            self.update_lattice_stat(child, new_match_vector)

    def initialize_bb_gt_contribution(self, black_box, ground_truth):
        idx = [i for i in range(len(self.y_gt)) if self.y_pred[i]==black_box and self.y_gt[i]==ground_truth]
        cont_vector = np.zeros(self.df.shape[0])
        cont_vector[idx] = 1
        return cont_vector
       
    def filter_rules(self, filters):
        print(filters)
        feat_filter = filters['feat_filter']
        pred_filter = int(filters['pred_filter'])

        if (len(feat_filter.keys()) == 0 and pred_filter<0):
            return self.target_rule_set 

        to_present = []
        for the_rule in self.target_rule_set:
            rule = the_rule['rules']
            to_add = False
            if (the_rule['label'] == pred_filter or pred_filter == -1):
                if (len(feat_filter.keys()) == 0):
                    to_add = True
                else:
                    for cond in rule:
                        if (str(cond['feature']) not in feat_filter.keys()):
                            continue
                        if (int(feat_filter[str(cond['feature'])]) != -1 and (int(feat_filter[str(cond['feature'])]) not in cond['range'])):
                            continue
                        to_add = True
                        break
            if (to_add):
                to_present.append(the_rule)
        return to_present

    def find_rules_for_subgroups(self, data_filters):
        print(data_filters)
        if (len(data_filters.keys()) == 0):
            return self.target_rule_set 

        cols = self.df.columns
        subgroup = np.zeros(self.df.shape[0])
        to_present = []

        # initialize mathced vector
        matched_data = pd.DataFrame(self.df)
        for feat in data_filters.keys():
            val = int(data_filters[feat])
            feat_idx = int(feat)
            col = cols[feat_idx]
            if (val < 0): 
                continue

            if (val == 0):
                th0 = self.real_min[feat_idx]
                th1 = self.real_percentile['percentile_table'][0][feat_idx]
            elif (val == self.num_bin-1):
                th0 = self.real_percentile['percentile_table'][self.num_bin-2][feat_idx]
                th1 = self.real_max[feat_idx]
            else:
                th0 = self.real_percentile['percentile_table'][val-1][feat_idx]
                th1 = self.real_percentile['percentile_table'][val][feat_idx]

            matched_data = matched_data[(matched_data[col] >= th0) & (matched_data[col] < th1)]
            matched_index = matched_data.index.values.astype(int)
            subgroup[matched_index] = 1

        # find descriptive rules
        # for rule_idx in range(len(self.rule_ord)):
        #     if (np.logical_and(subgroup, self.rule_matched_table[self.rule_ord[rule_idx]]).sum() > 0):
        #         rid = target_set[rule_ord]
        #     r = self.rules[rid]
        #         to_present.append(self.rules[rule_idx])

        for rule_ord in self.rule_ord:
            rid = self.target_set[rule_ord]
            r = self.rules[rid]
            if (np.logical_and(subgroup, self.rule_matched_table[rid]).sum() > 0):
                to_present.append(self.rules[rid])

        return to_present








