# Input Data For SuRE

To use SuRE with your own data, you only need to generate a file with desired format. Ideally, we need the following information in file:

`cols`:  the column names of the input data.

`data`: the training input.

`target_names`: the names for the target classes (grount truth).

`real_min`: minimal values for columns of the input data.

`real_max`: maximal values for columns of the input data.

`y_pred`: the prediction of the input data from the model you want to explain.

`y_gt`: the ground truth of the input data.

The notebook [generate_data_without_training](https://github.com/nyuvis/SuRE/blob/master/prepare/generate_data_without_training.ipynb) shows an example of how to generate desired json file given the training input and the output from a model. The notebook [generate_data+training](https://github.com/nyuvis/SuRE/blob/master/prepare/generate_data%2Btraining.ipynb) demonstrates how to generate desired json file given training data and a trained sklearn classification model.

