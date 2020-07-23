from forest_info import Forest
import json
import os
import pandas as pd
from flask import Flask
from flask_cors import CORS
from flask import request
from flask import send_from_directory
import tree_node_info

app = Flask(__name__, static_folder="../static", template_folder="../static")
CORS(app)

forest = Forest()

@app.route("/index.html",  methods=['POST', 'GET'])
def index():
	print("return index.html")
	return send_from_directory('../static/', 'interactive_table_graph.html')

@app.route("/interactive_rule_tree.html",  methods=['POST', 'GET'])
def index_tree():
	print("return tree index.html")
	return send_from_directory('../static/', 'interactive_rule_tree.html')

@app.route('/static/<path:path>',  methods=['POST', 'GET'])
def send_static(path):
	print("return file at: "+path)
	return send_from_directory('../static', path)

@app.route('/data/<path:path>',  methods=['POST', 'GET'])
def send_data(path):
	print("return data: "+path)
	return send_from_directory('../data', path)

@app.route("/initialize/<dataname>", methods=['POST', 'GET'])
def initialize(dataname):
	print("start initialization")
	folder = "./data/" + dataname + "/"
	node_info = []
	real_min = []
	real_max = []
	with open(folder + 'node_info.json', 'r') as json_input:
		node_info = json.load(json_input)['node_info_arr']
	with open(folder + 'test.json', 'r') as json_input:
		data = json.load(json_input)
		real_min = data['real_min']
		real_max = data['real_max']
		real_percentile = data['real_percentile']
		df = pd.DataFrame(columns=data['columns'], data=data['data'])
		y_pred = data['y_pred']
		y_gt = data['y_gt']
	with open(folder + 'list.json', 'r') as json_input:
		rules = json.load(json_input)['rule_lists']

	forest.initialize(node_info, real_min, real_max, real_percentile, df, y_pred, y_gt,rules)
	forest.initialize_rule_match_table()
	rule_to_show = forest.find_the_min_set()
	print("====initialized====")
	return rule_to_show

@app.route("/generate_surrogate_rules/", methods=['POST'])
def generate_surrogate_rules():
	print("===== generate surrogate rules ======")
	para = json.loads(str(request.get_json(force=True)))
	filter_threshold = para['filter_threshold']
	for key in filter_threshold:
		if (key!='fidelity'):
			filter_threshold[key] = int(filter_threshold[key])
		else:
			filter_threshold[key] = float(filter_threshold[key])

	num_bin = para['filter_threshold']['num_bin']
	dataname = para['dataname']
	folder = "./data/" + dataname + "/"

	with open(folder + 'test.json', 'r') as json_input:
		data = json.load(json_input)
		df = pd.DataFrame(columns=data['columns'], data=data['data'])
		y_pred = data['y_pred']
		y_gt = data['y_gt']
	
	# train surrogate
	surrogate_obj = tree_node_info.tree_node_info()
	to_keep = df.columns
	X = df.values
	surrogate_obj.initialize(X=X, y=y_gt, y_pred=y_pred, 
	                         attrs=to_keep, filter_threshold=filter_threshold,
	                         num_bin=num_bin, verbose=True
	).train_surrogate_random_forest().tree_pruning()

	# extract rules
	forest_obj = tree_node_info.forest()
	forest_obj.initialize(
	    trees=surrogate_obj.tree_list, cate_X=surrogate_obj.cate_X, 
	    y=y_gt, y_pred=y_pred, attrs=to_keep, num_bin=num_bin,
	    real_percentiles=surrogate_obj.real_percentiles,
	    real_min=surrogate_obj.real_min, real_max=surrogate_obj.real_max,
	).construct_tree().extract_rules()

	# find min set
	# rs = tree_node_info.forest_rules()
	# rs.initialize(pd.DataFrame(data=X, columns=to_keep), forest_obj.rule_lists, surrogate_obj.real_min, surrogate_obj.real_max)
	# ts = rs.find_the_min_set()

	# initialize info for front-end
	real_min = surrogate_obj.real_min
	real_max = surrogate_obj.real_max
	real_percentiles = surrogate_obj.percentile_info
	forest.initialize(forest_obj.tree_node_dict, real_min, real_max, real_percentiles, df, y_pred, y_gt, forest_obj.rule_lists)
	forest.initialize_rule_match_table()
	res = forest.find_the_min_set()
	res['node_info_arr'] = forest_obj.tree_node_dict

	# graph links
	graph = forest.get_graph_links()
	res['nodes'] = graph['nodes']
	res['links'] = graph['links']
	res['real_percentile'] = real_percentiles
	# print(res)
	return json.dumps(res)

@app.route("/find_leaf_rules", methods=['POST'])
def find_leaf_rules():
	print("===== FIND LEAF RULES =====")
	print("content type: ",  request.content_type)
	new_node_ids = json.loads(str(request.get_json(force=True)))
	leaf_rules = forest.find_leaf_rules(new_node_ids)
	return {'rule_lists': leaf_rules}

@app.route("/find_node_rules", methods=['POST'])
def find_node_rules():
	print("====== FIND NODE RULES ======")
	node_ids = json.loads(str(request.get_json(force=True)))
	ranked_rules = forest.find_node_rules(node_ids)
	return {'rule_lists': ranked_rules}

@app.route("/find_linked_rules/<node_id>")
def find_linked_rules(node_id):
	print("===== FIND LINKED RULES =====")
	try:
		int_node_id = int(node_id)
	except:
		return "Please enter a number"
	ranked_rules = forest.find_linked_rules(int_node_id)
	return {'rule_lists': ranked_rules}

@app.route("/get_matched_data", methods=['POST'])
def get_matched_data():
	print("===== GET MATCHED DATA =====")
	rule = json.loads(str(request.get_json(force=True)))
	matched_res = forest.get_matched_data(rule["rules"])
	return matched_res

@app.route("/get_rules_by_level/<depth>")
def get_rules_by_level(depth):
	print("===== FIND RULES BY LEVEL =====")
	try:
		int_depth= int(depth)
	except:
		return "Please enter a number"
	res = forest.get_rules_by_level(int_depth)
	return res

@app.route("/generate_rules")
def generate_rules_after_filtering():
	print("===== generate_rules =====")
	threshold = json.loads(str(request.get_json(force=True)))
	res = forest.generate_tree_and_rules(threshold)
	return res

@app.route("/get_histogram", methods=['POST'])
def get_histogram():
	print("===== get_histogram =====")
	selection = json.loads(str(request.get_json(force=True)))
	selected_hist = forest.get_histogram(selection)
	return {'res': selected_hist}

@app.route("/get_compare_data/<rid>", methods=['POST', 'GET'])
def get_compare_data(rid):
	print("===== GET COMPARE DATA ======")
	try:
		rid = int(rid)
	except:
		return "Please enter a number"
	res = forest.get_compare_data(rid)
	return res

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=6060)