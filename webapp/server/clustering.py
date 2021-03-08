import numpy as np
import pandas as pd
import copy
from scipy.cluster.hierarchy import ward, fcluster


class Cluster():
	def initialize(dataset):
		path = "data/" + dataset + "/Z_linkage.json"
		with open(path, 'r') as json_input:
			data = json.load(json_input)
			self.Z = np.array(data)

	def get_cluster_res(distance):
		return fcluster(self.Z, distance, criterion='distance')

