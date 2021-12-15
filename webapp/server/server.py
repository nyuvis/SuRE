from surrogate_rule.forest_info import Forest
import json
import os
import pandas as pd
import numpy as np
from flask import Flask
from flask_cors import CORS
from flask import request
from flask import send_from_directory
from surrogate_rule import tree_node_info

app = Flask(__name__, static_folder="../static", template_folder="../static")
CORS(app)

forest = Forest()
uploaded_data = None

@app.route("/",  methods=['POST', 'GET'])
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

@app.route('/upload/', methods=["POST", "GET"])
def upload():
	print('uploading')
	para = json.loads(str(request.get_json(force=True)))
	dataname = para['file_key']
	content = para['content']

	directory = "./data/user_defined/"
	if not os.path.exists(directory):
		os.makedirs(directory)

	folder = directory + dataname + '.json'
	with open(folder, 'w') as output:
		output.write(json.dumps(content))
	return json.dumps("uploaded successfully")


@app.route('/clear_user_defined/', methods=["POST", "GET"])
def clear_file():
	para = json.loads(str(request.get_json(force=True)))
	directory = "./data/user_defined/"

	for dataname in para['file_key']:
		if os.path.exists( directory + dataname + '.json'):
			os.remove(directory+ dataname + '.json')
		else:
			print("The file does not exist")
		print('------- clear user defined file --------')
	return json.dumps("deleted the temp file")

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
	debug_class = int(para['debug_class'])
	print('debug_class:', debug_class)

	initial_extract = bool(para['initial'])
	num_bin = para['filter_threshold']['num_bin']
	dataname = para['dataname']
	path = "./data/" + dataname + "/test.json"
	if (dataname == 'user_defined'):
		path = "./data/user_defined/" + para['file_key'] + ".json"

	test_content = {}
	with open(path, 'r') as json_input:
		data = json.load(json_input)
		df = pd.DataFrame(columns=data['columns'], data=data['data'])
		y_pred = np.array(data['y_pred'])
		y_gt = np.array(data['y_gt'])

	if (initial_extract):
		filter_threshold['support'] = int(np.floor(y_gt.shape[0] * .05))
	
	# train surrogate
	surrogate_obj = tree_node_info.tree_node_info()
	to_keep = df.columns
	X = df.values
	n_cls = 2
	if ('n_cls' in data):
		n_cls = data['n_cls']
	surrogate_obj.initialize(X=X, y=y_gt, y_pred=y_pred, debug_class=debug_class,
	                         attrs=to_keep, filter_threshold=filter_threshold,
	                         dataname=dataname, n_cls=n_cls,
	                         num_bin=num_bin, verbose=True
	).train_surrogate_random_forest().tree_pruning()

	# extract rules
	forest_obj = tree_node_info.forest()
	forest_obj.initialize(
	    trees=surrogate_obj.tree_list, cate_X=surrogate_obj.cate_X, 
	    y=surrogate_obj.y, y_pred=surrogate_obj.y_pred, attrs=to_keep, num_bin=num_bin,
	    real_percentiles=surrogate_obj.real_percentiles,
	    real_min=surrogate_obj.real_min, real_max=surrogate_obj.real_max,
	).construct_tree().extract_rules()

	# initialize info for front-end
	real_min = surrogate_obj.real_min
	real_max = surrogate_obj.real_max
	real_percentiles = surrogate_obj.percentile_info
	target_names = data['target_names']

	forest.initialize(forest_obj.tree_node_dict, real_min, real_max, real_percentiles, 
		df, y_pred, y_gt,
		forest_obj.rule_lists,
		target_names, n_cls)
	forest.initialize_rule_match_table()
	forest.initilized_rule_overlapping()
	res = forest.find_the_min_set()
	res['node_info_arr'] = forest_obj.tree_node_dict
	# get histogram
	res['histogram'] = forest.initialize_histogram()

	# lattice structure
	res['lattice'] = forest.get_lattice_structure(res['rules'])
	res['lattice_preIndex'] = forest.preIndex

	# for front-end process
	res['real_percentile'] = real_percentiles
	res['test_content'] = data
	if (initial_extract):
		res['min_support'] = filter_threshold['support']

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
		return "Rule id should be a number"
	res = forest.get_compare_data(rid)
	return res

@app.route("/filter_rules/", methods=['POST'])
def filter_rules():
	print("===== filter_rules =====")
	filters = json.loads(str(request.get_json(force=True)))
	res = {}
	res['rules'], res['coverage'] = forest.filter_rules(filters)
	res['lattice'] = forest.get_lattice_structure(res['rules'])
	res['lattice_preIndex'] = forest.preIndex

	return json.dumps(res)

@app.route("/filter_rules_by_data/", methods=['POST'])
def filter_rules_by_data():
	print("===== filter_rules_by_data =====")
	filters = json.loads(str(request.get_json(force=True)))
	res = {}
	res['rules'] = forest.find_rules_for_subgroups(filters)
	res['lattice'] = forest.get_lattice_structure(res['rules'])
	return json.dumps(res)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=6060)
