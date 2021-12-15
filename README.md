# SuRE: A Surrogate Rule Exploration Method

SuRE is an interactive user interface for visual exploration of surrogate rules that describe a black-box model’s behaviors on different groups of instances.

If-then rules are widely used as a way to communicate the logic of a Machine Learning (ML) model when transparency and interpretability are required. For example, the rule *"If Glucose < 108 and Age < 33, then low risk of diabetes"* describes the model's behavior: for people with Glucose < 136 and Age < 33, the model consistently suggests a low risk of diabetes.

However, the traditional visual representation of a set of rules does not support an inspection of individual conditions, that is, how an individual condition influences the model behavior. Based on this, we propose a feature-aligned tree visualization for rule logic exploration.

For example, a set of rules that describes how a model suggests risks of diabetes can be visualized like below:

![image](https://user-images.githubusercontent.com/77811546/112119975-3aa14400-8b94-11eb-9c97-e671930f953a.png)

## Table of Content

- [Repository Structure](repository-structure)
- [Generate explanations for your own data with live demo](#generate-explanations-for-your-own-data-live-demo)
- [Run the web app locally](#web-application)

## Repository Structure

`prepare/` folder:

- The notebook [generate_output_without_training.ipynb](https://github.com/nyuvis/SuRE/blob/master/prepare/generate_data_without_training.ipynb) and [generate_output+training.ipynb](https://github.com/nyuvis/SuRE/blob/master/prepare/generate_data%2Btraining.ipynb) illustrate how to generate the necessary output files for the visual analytics system in `webapp`. After running the code in the notebook, you will get two files:
  - `test.json` which contains the original input, target values (ground truth), and model prediction.

`webapp/` folder:

- this folder contains all the components of the visual analytics system SuRE.
- `data/` contains the data you want to explore in the web application. You can generate necessary data in a format the web application can recognize by running the code in the `prepare/` folder. 
- `server/` contains the back-end code for generating explanations.
- `static/` contains the front-end code. 

## Generate explanations for your own data (live demo)

You can upload your own data to our live demo that is running on our server. And then gernerate explanations for your own data and model.

Because the [demo](http://nyuvis-web.poly.edu/projects/isure/) needs to read the data in a specific format. You can run the code in the `prepare` folder to generate a formatted data. Once you get the data, you can go to our live demo, uploade your own data, and check the rules.

- Step 1: Put your own data in the [prepare/input](https://github.com/nyuvis/SuRE/tree/master/prepare/input) folder. If you have trained a model, you can put the model prediction in the same folder.

- Step 2: You can run the code in [generate_output+training.ipynb](https://github.com/nyuvis/SuRE/blob/master/prepare/generate_data%2Btraining.ipynb) to read your own data, train a SVM model on the fly, and then generate the formatted data with both your data and the SVM model predictions on your data. 
  - If you want to use the model prediction of your own model, you can run the code in [generate_output_without_training.ipynb](https://github.com/nyuvis/SuRE/blob/master/prepare/generate_data_without_training.ipynb). 
  - You may want to change some columns or variables according to your own needs
  
- Step 3: Open the [live demo](http://nyuvis-web.poly.edu/projects/isure/) and choose the dataset of `*import data*`. And you will be asked to set the explanation parameters and upload your own data.

- Step 4: Upload your model by clicking the button of `Choose File`. 

- Step 5: Click `Generate Rules`. And specify the values for the paramters as shown below.

  ![image](https://user-images.githubusercontent.com/9759891/146227522-ead028e6-bb0d-4e51-9bc6-1f7a80ad4c22.png)

- Step 6: Explore the rules in the user interface.

## Web application
### How to run the app locally with your own data

- Open the terminal at the directory of  `webapp`
- Install necessary python libraries:
  - run `pip install --upgrade -r requirements.txt`
- Run the server: 
  - run the command line `python server/server.py`. Please notice that the code is for python 3. And in some system, you may need to run the command `python3 server/server.py`.
- Visit the web application at `localhost:6060`.

By default, the system show the data of a diabetes dataset. 

