import numpy as np
import pandas as pd
import copy
from sklearn.metrics.pairwise import cosine_similarity
from scipy.cluster.hierarchy import ward, leaves_list
from scipy.spatial.distance import pdist
from sklearn.ensemble import RandomForestClassifier
from sklearn.utils import resample

class tree_node_info:
    def initialize(self, X, y, y_pred, attrs, filter_threshold, num_bin, debug_class, n_cls=2,
            dataname=None, verbose=False):
        self.verbose = verbose
        self.X = X
        self.cate_X = self.get_cate_X(X, num_bin)
        self.real_min = np.min(X, axis=0)
        self.real_max = np.max(X, axis=0)
        self.y = y.astype(int)
        self.y_pred = y_pred.astype(int)
        self.attrs = attrs
        self.filter_threshold = filter_threshold
        self.num_bin = num_bin
        self.debug_class = debug_class
        self.n_cls = n_cls
        self.dataname = dataname
        return self

    def get_cate_X(self, X, num_bin):
        step = 100 / num_bin
        self.real_percentiles = []
        self.percentile_info = {"num_bin": num_bin, "percentile": [], "percentile_table": []}
        for i in range(num_bin-1):
            self.real_percentiles.append(np.percentile(X, q=np.round(step*(i+1)), axis=0).tolist())
            self.percentile_info['percentile'].append(step*(i+1))
        self.percentile_info['percentile_table'] = self.real_percentiles
        
        cate_X = []
        for col_idx in range(X.shape[1]):
            cate_X.append([self.transform_func(col_idx, ele, num_bin) for ele in X[:, col_idx]])
        
        cate_X = np.transpose(np.array(cate_X))
        if (self.verbose):
            print("***** finish transforming ordinal data *****")
        return cate_X 

    def transform_func(self, col_idx, ele, num_bin):
        for i in range(num_bin-1):
            if (ele < self.real_percentiles[i][col_idx]):
                return i
        return num_bin-1

    def prepare_for_debug_training(self):
        self.label = np.zeros(shape=self.y.shape)
        for pred in range(self.n_cls):
            for gt in range(self.n_cls):
                res =  (self.y == gt) & (self.y_pred == pred)
                idx = [i for i, val in enumerate(res) if val]
                self.label[idx] = pred * n_cls + gt
 
    def train_surrogate_random_forest(self):
        self.rfc=RandomForestClassifier(random_state=1234, n_estimators=100, )

        if (self.debug_class >= 0):
            self.prepare_for_debug_training()
            self.rfc.fit(self.cate_X, self.label)
            if (self.verbose):
                print("***** finish training surrogate random forest *****")
                print("surrogate overall fidelity:", self.rfc.score(self.cate_X, self.label))
        else:
            self.rfc.fit(self.cate_X, self.y_pred)
            if (self.verbose):
                print("***** finish training surrogate random forest *****")
                print("surrogate overall fidelity:", self.rfc.score(self.cate_X, self.y_pred))

        importances = self.rfc.feature_importances_
        print(importances)
        
        return self

    def tree_pruning(self):
        ''' get tree info from the forest '''
        estimators = self.rfc.estimators_

        tree_list = []
        count = 0
        tot = len(estimators)
        for estimator in estimators:
            self.extract_node_rule_info(estimator)
            tree_list.append(self.node_info_dict)
            if (self.verbose):
                print("***** finish node indexing for tree no.", count, "/", tot, "*****")
            count += 1
        self.tree_list = tree_list
        return self

    def extract_node_rule_info(self, estimator):
        # tree information
        self.n_nodes = estimator.tree_.node_count
        self.children_left = estimator.tree_.children_left
        self.children_right = estimator.tree_.children_right
        self.feature = estimator.tree_.feature
        self.threshold = estimator.tree_.threshold
        self.value = estimator.tree_.value
        # value: number of training samples that has the label of class_id falling into this node
        if (self.debug_class < 0):
            self.value = self.value.reshape(len(self.value),self.n_cls)
        else:
            self.value = self.value.reshape(len(self.value),self.n_cls*2)

        self.initialize_node_info()
        self.initialize_node_info_with_stat(estimator)
        self.node_info_dict['leaves'] = self.leaves
        return self

    def initialize_node_info(self):
        self.node_depth = np.zeros(shape=self.n_nodes, dtype=np.int64)
        self.is_leaves = np.zeros(shape=self.n_nodes, dtype=bool)
        stack = [(0, -1)]  # seed is the root node id and its parent depth
        self.parent = np.zeros(shape=self.n_nodes, dtype=np.int64)
        self.parent[0] = -1
        self.leaves = []

        self.leave_labels = []

        node_info_list = []
        while len(stack) > 0:
            node_id, parent_depth = stack.pop()
            self.node_depth[node_id] = parent_depth + 1
            node = {
                "node_id": node_id,
                "parent": self.parent[node_id],
                "children": [self.children_left[node_id], self.children_right[node_id]],
                "feature": self.feature[node_id],
                "threshold": self.threshold[node_id],
                "value": self.value[node_id]
            }

            node_info_list.append(node)
            # If we have a test node
            if (self.children_left[node_id] != self.children_right[node_id]):
                self.parent[self.children_left[node_id]] = node_id
                self.parent[self.children_right[node_id]] = node_id
                stack.append((self.children_left[node_id], parent_depth + 1))
                stack.append((self.children_right[node_id], parent_depth + 1))
            else:
                self.is_leaves[node_id] = True
                # self.leaves.append(node_id)
                parent_id = self.parent[node_id]
                if (self.value[node_id][0] > self.value[node_id][1]):            
                    self.leave_labels.append(0)
                else:
                    self.leave_labels.append(1)
        self.node_info_dict = {x['node_id']: x for x in node_info_list}
        # self.node_info_dict['leaves'] = self.leaves

    '''
    Parameters of filter threshold:
        support: min number of matched instances;
        fidelity: min fidelity of the surrogate tree compared with black-box model;
        num_feat: max number of features used in a path.
    '''
    def set_filters(self, threshold):
        for key in threshold:
            self.filter_threshold[key] = threshold[key]
        return self

    '''
    Go through the tree to get some matching statistics. 
    For all node_ids and class_ids, we will get the following statistics after going through the tree.
        node_match[node_id]: the number of instances that matches the condition until this node.
        node_gt[node_id][class_id]: the number of instances that matches the condition until 
            this node and their ground truth is class_id.
        node_bb[node_id][class_id]: the number of instances that matches the condition
            until this node and the black-box model predit them as class_id.
        node_bb_gt[node_id][class_id]: number of instances that fall into this node
            and both the tree and the black-box model predit them as class_id.
        node_conf[node_id][bb_class][gt_class]: number of instances that fall into this node that 
            the black-box predict them as bb_class while the ground truth is gt_class.
    '''
    def initialize_node_info_with_stat(self, estimator):
        self.tot_size = self.cate_X.shape[0]
        self.node_matched = np.zeros(shape=self.n_nodes)
        self.node_gt = np.zeros(shape=(self.n_nodes, self.n_cls))
        self.node_bb = np.zeros(shape=(self.n_nodes, self.n_cls))
        self.node_pred = np.zeros(shape=self.n_nodes).astype(int)
        self.node_bb_gt = np.zeros(shape=(self.n_nodes, self.n_cls))

        ''' 
         Apply testing data to leave node 
            test: testing data
            y_test_svm: testing black-box prediction
            test_labels: testing ground truth

            leave_index: the index of leaves that instances fall into.
            leave_pred: the prediction of surrogate tree.
        '''
        leave_index = estimator.apply(self.cate_X)
        leave_pred = estimator.predict(self.cate_X)

        self.node_info_arr = []

        self.node_feat_mark = np.zeros(shape=(self.n_nodes, len(self.attrs)))

        ''' initialize the leaf nodes, enumerate the prediction of each instance. '''
        for idx, node_id in enumerate(leave_index):
            self.node_matched[node_id] += 1
            self.node_bb[node_id][self.y_pred[idx]] += 1
            self.node_gt[node_id][self.y[idx]] += 1
            self.node_bb_gt[node_id][self.y_pred[idx]] += (self.y_pred[idx]==self.y[idx])
            self.node_pred[node_id] = np.argmax(self.value[node_id])
            if (self.debug_class >= 0):
                self.node_pred[node_id] = self.node_pred[node_id] // self.n_cls

        ''' initialize the marks on the root'''
        self.node_feat_mark[0][self.feature[0]] = 0

        self.go_through_a_tree(0)    
        self.node_feat_mark[0][self.feature[0]] = 0
        self.derive_tree_data(0, -1, "", 0)
        return self

    def go_through_a_tree(self, node_id):
        if self.is_leaves[node_id]:
            self.node_feat_mark[node_id] = self.node_feat_mark[self.parent[node_id]]
            return

        '''feat. processing'''
        self.node_feat_mark[node_id][self.feature[node_id]] = 1
        self.node_feat_mark[node_id] = np.logical_or(self.node_feat_mark[node_id], self.node_feat_mark[self.parent[node_id]])

        ''' recursion '''
        left_child = self.children_left[node_id]
        right_child = self.children_right[node_id]
        self.go_through_a_tree(left_child)
        self.go_through_a_tree(right_child)
        ''' processing '''
        self.node_matched[node_id] = self.node_matched[left_child] + self.node_matched[right_child]
        for class_id in range(self.n_cls):
            self.node_bb[node_id][class_id] = self.node_bb[left_child][class_id] + self.node_bb[right_child][class_id]
            self.node_gt[node_id][class_id] = self.node_gt[left_child][class_id] + self.node_gt[right_child][class_id]
            self.node_bb_gt[node_id][class_id] = self.node_bb_gt[left_child][class_id] + self.node_bb_gt[right_child][class_id]
            
        self.node_pred[node_id] = np.argmax(self.value[node_id])
        if (self.debug_class >= 0):
            self.node_pred[node_id] = self.node_pred[node_id] // self.n_cls
        ''' redefine node_feat_mark '''
        if (node_id > 0):
            self.node_feat_mark[node_id] = self.node_feat_mark[self.parent[node_id]]


    def derive_tree_data(self, node_id, parent_id, sign, dep):
        ''' filter the nodes '''
        if (self.node_matched[node_id] < self.filter_threshold['support']  
            or self.node_feat_mark[node_id].sum() > self.filter_threshold['num_feat']):
            return []

        '''update node information'''
        node_info = self.node_info_dict[node_id]
        node_info['sign'] = sign
        node_info['dep'] = dep
        node_info['support'] = self.node_matched[node_id] / self.tot_size
        node_info['depth'] = self.node_depth[node_id]
        node_info['num_feat'] = self.node_feat_mark[node_id].sum()
        node_info["accuracy"] = 0

        if (self.node_matched[node_id] > 0):
            node_info['fidelity'] = float(self.node_bb[node_id][self.node_pred[node_id]] / self.node_matched[node_id])
            
        if (self.node_bb[node_id][self.node_pred[node_id]] > 0):
            node_info['accuracy'] = float(self.node_bb_gt[node_id][self.node_pred[node_id]] / self.node_bb[node_id][self.node_pred[node_id]])
        self.node_info_dict[node_id] = node_info

        if (node_info['fidelity'] >= self.filter_threshold['fidelity'] and node_info['num_feat']>=1):
            self.leaves.append(node_id)
            return self

        res1 = []
        res2 = []
        if (self.children_right[node_id] >= 0):
            res1 = self.derive_tree_data(self.children_right[node_id], node_id, ">", dep+1)
        if (self.children_left[node_id] >= 0):
            res2 = self.derive_tree_data(self.children_left[node_id], node_id, "<=", dep+1)

        return self

class forest():
    def initialize(self, trees, cate_X, y, y_pred, attrs, num_bin, real_percentiles, real_min, real_max):
        self.trees = trees
        self.cate_X = cate_X
        self.y = y
        self.y_pred = y_pred
        self.attrs = attrs
        self.num_bin = num_bin
        self.real_percentiles = real_percentiles
        self.real_min = real_min
        self.real_max = real_max

        self.max_id = 0
        self.leaves = []
        self.tree_node_dict = {}
        return self

    '''
        construct a new tree based on nodes from multiple trees.
    '''
    def construct_tree(self):
        self.root = 0
        self.tree_node_dict[0] = {
            'node_id': 0,
            'children_id': [],
            'parent': -1,
            'feature': -1,
            'threshold': -1,
            'sign': '',
            'value': (self.trees[0][0]['value']).tolist(),
            'support': float(self.trees[0][0]['support']),
            'depth': 0,
            'num_feat': 0,
            'fidelity': 0,
            'accuracy': 0, 
        }
        for tree_idx in range(len(self.trees)):
            for leaf_idx in self.trees[tree_idx]['leaves']:
                path = self.get_path(tree_idx, leaf_idx)
                # print(path)
                common_ancestor, path_node_pos = self.find_common_ancestor(tree_idx, path)
                if (path_node_pos < len(path)):
                    self.update_subtree_node(common_ancestor, tree_idx, path, path_node_pos)

        # self.tree_node_dict = {x['node_id']: x for x in self.tree_nodes}
        return self

    '''
        return the list of node information in the form that can be visualized as hierarchical structure.
    '''
    def get_vis_hierarchy(self):
        tree_info = [self.derive_a_tree(0)]
        return tree_info

    '''
        returns node ids on a tree path from root to leaf.
    '''
    def get_path(self, tree_idx, leaf_idx):
        node_list = []
        node_id = leaf_idx
        while (node_id >= 0):
            node_list.append(node_id)
            node_id = self.trees[tree_idx][node_id]['parent']
        node_list.reverse()
        return node_list

    def find_common_ancestor(self, tree_idx, node_list):
        candidate= 0
        node_idx = 0
        move_on = True
        while (move_on and node_idx<len(node_list)):
            move_on = False
            children = self.tree_node_dict[candidate]['children_id']
            for child_idx in range(len(children)):
                if (self.node_equals(self.tree_node_dict[children[child_idx]], self.trees[tree_idx][node_list[node_idx]])):
                    move_on = True
                    candidate = children[child_idx]
                    node_idx += 1
                    break
        return candidate, node_idx

    def node_equals(self, a, b):
        return (a['feature'] == b['feature'] and a['sign'] == b['sign'] and a['threshold'] == b['threshold'])


    def update_subtree_node(self, common_ancestor, tree_idx, path, path_node_pos):
        self.tree_node_dict[common_ancestor]['children_id'].append(self.max_id+1)
        # update common ancestor
        self.tree_node_dict[common_ancestor]['support'] = self.trees[tree_idx][path[path_node_pos]]['support']

        # update child nodes
        parent_id = common_ancestor
        for idx in range(path_node_pos, len(path)):
            old_id = path[idx]
            self.max_id += 1
            new_node = {
                'node_id': self.max_id,
                'children_id': [],
                'parent': parent_id,
                'feature': int(self.trees[tree_idx][old_id]['feature']),
                'threshold': float(self.trees[tree_idx][old_id]['threshold']),
                'sign': self.trees[tree_idx][old_id]['sign'],
                "value": self.trees[tree_idx][old_id]['value'].tolist(),
                'support': float(self.trees[tree_idx][old_id]['support']),
                'depth': int(self.trees[tree_idx][old_id]['depth']),
                'num_feat': int(self.trees[tree_idx][old_id]['num_feat']),
                'fidelity': float(self.trees[tree_idx][old_id]['fidelity']),
                'accuracy': float(self.trees[tree_idx][old_id]['accuracy']), 
            }
            if (idx<len(path)-1):
                new_node['children_id'].append(self.max_id+1)
            self.tree_node_dict[new_node['node_id']] = new_node
            parent_id = self.max_id
        self.leaves.append(self.max_id)

    def derive_a_tree(self, node_id):
        if (len(self.tree_node_dict[node_id]['children_id'])==0):
            return self.tree_node_dict[node_id]
        if (node_id < 0):
            return []
        node_info = self.tree_node_dict[node_id]
        children_data = []
        for child_id in self.tree_node_dict[node_id]['children_id']:
            cdata = self.derive_a_tree(child_id)
            if (cdata != []):
                children_data.append(cdata)

        node_info["children"] = children_data
        return node_info

    def translate_rule(self, feat_range, feat_idx):
        num_bin = self.num_bin
        # find the integers that fit
        ranges = []
        for i in range(num_bin):
            if (i >= feat_range[0] and i <= feat_range[1]):
                ranges.append(i)

        if (ranges[0] == 0):
            # (min, threshold]
            cond = {
                'feature': feat_idx,
                'sign': '<=',
                'threshold': self.rep_range[feat_idx][ranges[-1]][1]
            }
        elif (ranges[-1] == num_bin-1):
            # (threshold, max]
            cond = {
                'feature': feat_idx,
                'sign': '>',
                'threshold': self.rep_range[feat_idx][ranges[0]][0]
            }
        else:
            # (threshold0, threshold1]
            cond = {
                'feature': feat_idx,
                'sign': 'range',
                'threshold0': self.rep_range[feat_idx][ranges[0]][0],
                'threshold1': self.rep_range[feat_idx][ranges[-1]][1]
            }
        cond['range'] = ranges
        return cond

    def extract_rules(self):
        real_percentiles = self.real_percentiles
        real_min = self.real_min
        real_max = self.real_max
        num_bin = self.num_bin

        self.rep_range = np.zeros(shape=(len(self.attrs), self.num_bin, 2))
        
        for idx in range(len(self.attrs)):
            self.rep_range[idx][0] = np.array([real_min[idx], real_percentiles[0][idx]])
            for bin_idx in range(num_bin-2):
                self.rep_range[idx][bin_idx+1] = np.array([real_percentiles[bin_idx][idx], real_percentiles[bin_idx+1][idx]])
            self.rep_range[idx][num_bin-1] = np.array([real_percentiles[num_bin-2][idx], real_max[idx]])

        rule_lists = []

        for i in range(len(self.leaves)):
            debug_id = self.leaves[i]
            node_id = self.leaves[i]
            feature_range = np.zeros(shape=(len(self.attrs), 2), dtype=np.float128)
            feature_range[:, 0] = 0
            feature_range[:, 1] = num_bin - 1
            
            p_id = self.tree_node_dict[node_id]['parent']
            latest_app = np.zeros(shape=len(self.attrs))

            while p_id > 0:
                sign = self.tree_node_dict[node_id]['sign']
                if (p_id >= 0):
                    f_idx = self.tree_node_dict[p_id]['feature']
                    thrshd = self.tree_node_dict[p_id]['threshold']
                    latest_app[f_idx] = p_id
                    if (sign == '<='):
                        # (min, thrshd)
                        if (feature_range[f_idx][1] > thrshd):
                            feature_range[f_idx][1] = thrshd
                    else:
                        # (thrshd, max)
                        if (feature_range[f_idx][0] < thrshd):
                            feature_range[f_idx][0] = thrshd
                node_id = p_id
                p_id = self.tree_node_dict[node_id]['parent']

            rules = []
            for j in range(len(feature_range)):
                # summarize the condition
                if (feature_range[j][0]!=0 or feature_range[j][1]!=num_bin-1):                    
                    new_cond = self.translate_rule(feature_range[j], j)
                    new_cond['pid'] = latest_app[j]
                    rules.append(new_cond)
    
            pred_label = np.argmax(self.tree_node_dict[self.leaves[i]]['value'])

            rule_lists.append({
                "label": int(pred_label),
                "node_id": int(self.leaves[i]),
                "rules": rules,})
        self.rule_lists = rule_lists
