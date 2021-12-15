const domain = "http://localhost:6060/"

const BAND_RULE_VIS = "band_range";
const GRADIENT_RULE_VIS = "gradient_range";
const MEDIAN_RULE_VIS = "median_range";
const MEDIAN_VAL_VIS = "median_val_vis";

const MAXINT = 1073741819;

let new_nodes;

const default_threshold = {
	"support": 10,
	"fidelity": .8,
  	"num_feat": 3,
  	"num_bin": 3,
}

