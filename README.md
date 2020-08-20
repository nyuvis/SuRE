# SuRE: An Surrogate Rule Exploration Method

SuRE is an interactive user interface for visual exploration of surrogate rules that describe a black-box model’s behaviors on different groups of instances.

![image](https://user-images.githubusercontent.com/9759891/88327894-9a89d700-ccf5-11ea-929f-812673fc257f.png)



Please watch this [video](https://www.youtube.com/watch?v=kskukXg1X3s&feature=youtu.be) for an introduction and demo.

You can also play with the [demo](http://nyuvis-web.poly.edu/projects/isure/index.html) using pre-defined data.

## Repository Structure

`prepare/` folder:

- The notebook [generate_output_without_training.ipynb](https://github.com/nyuvis/SuRE/tree/master/prepare/generate_output_without_training.ipynb) and [generate_output+training.ipynb](https://github.com/nyuvis/SuRE/tree/master/prepare/generate_output+training.ipynb) illustrate how to generate the necessary output files for the visual analytics system in `webapp`. After running the code in the notebook, you will get two files:
  - `test.json` which contains the original input, target values (ground truth), and model prediction.

`webapp/` folder:

- this folder contains all the components of the visual analytics system SuRE.
- `data/` contains the data you want to explore in the web application. You can generate necessary data in a format the web application can recognize by running the code in the `prepare/` folder. 
- `server/` contains the back-end code for generating explanations.
- `static/` contains the front-end code. 

## Generate explanations for your own data (live demo)

You can upload your own data to our live demo that is running on our server. And then gernerate explanations for your own data and model.

Because the [demo](http://nyuvis-web.poly.edu/projects/isure/index.html) needs to read the data in a specific format. You can run the code in the `prepare` folder to generate a formatted data. Once you get the data, you can go to our live demo, uploade your own data, and check the rules.

- Step 1: Put your own data in the [prepare/input](https://github.com/nyuvis/SuRE/tree/master/prepare/input) folder. If you have trained a model, you can put the model prediction in the same folder.
- Step 2: You can run the code in [generate_output+training.ipynb](https://github.com/nyuvis/SuRE/tree/master/prepare/generate_output+training.ipynb) to read your own data, train a SVM model on the fly, and then generate the formatted data with both your data and the SVM model predictions on your data. 
  - If you want to use the model prediction of your own model, you can run the code in [generate_output_without_training.ipynb](https://github.com/nyuvis/SuRE/tree/master/prepare/generate_output_without_training.ipynb). 
  - You may want to change some columns or variables according to your own needs
- Step 3: Open the [live demo](http://nyuvis-web.poly.edu/projects/isure/index.html) and choose the dataset of `User Defined`. And you will be asked to set the explanation parameters and upload your own data as shown below.![image-20200820133633157](/Users/junyuan/Library/Application Support/typora-user-images/image-20200820133633157.png) 
- Step 4: Upload your model by clicking the button of `Choose File`. 
- Step 5: Click `Generate Rules`.
- Step 6: Explore the rules in the user interface.

## Web application

### How to run the app locally with your own data

#### 1. Generate necessary data for running the web application

- Please put your own data in the folder [prepare/input](https://github.com/nyuvis/SuRE/tree/master/prepare/input)
- Then make some changes to read your own data in the notebok [generate_output.ipynb](https://github.com/nyuvis/SuRE/tree/master/prepare/generate_output.ipynb) 
- You will get a folder named `user_defined` in [prepare/output](https://github.com/nyuvis/SuRE/tree/master/prepare/output)
- Move the `user_defined` folder to `webapp/data/`

#### 2. Run the server

- Open the terminal at the directory of  `webapp`
- Install necessary python libraries:
  - run `pip install --upgrade -r requirements.txt`
- Run the server: 
  - run the command line `python server/server.py`. Please notice that the code is for python 3. And in some system, you may need to run the command `python3 server/server.py`.
- Visit the web application at `localhost:6060/index.html`.

By default, the system show the data of a loan application dataset. If you want to test your own data, you can put the folder containing your data files under `data`, and rename your data folder as `default`. 

