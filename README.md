# SuRE: An Surrogate Rule Exploration Method

SuRE is an interactive user interface for visual exploration of surrogate rules that describe a black-box model’s behaviors on different groups of instances.

## Content

`prepare` folder:

- The notebook [generate_output.ipynb](https://github.com/nyuvis/SuRE/prepare/generate_output.ipynb) illustrates how to use the functions in [tree_node_info.py](), as well as how to generate the necessary output files for the visual analytics system in `webapp`.

`webapp` folder:

- this folder contains all the components of the visual analytics system iSuRE.
- `data` contains the explanation information we want to explore in the web application.
- `server` contains the back-end code.
- `static` contains the front-end code. 

## Web application

### 1. Live Demo and Introduction

You can visit [here](http://nyuvis-web.poly.edu/projects/isure/index.html) to play with the live demo.

Please watch this [video](https://www.youtube.com/watch?v=kskukXg1X3s&feature=youtu.be) for an introduction and demo.

### 2. How to run the app locally with your own data

#### 2.1 Generate necessary data for running the web application

- Please put your own data in the folder [prepare/input](https://github.com/nyuvis/SuRE/prepare/input)
- Then make some changes to read your own data in the notebok [generate_output.ipynb](https://github.com/nyuvis/SuRE/prepare/generate_output.ipynb) 
- You will get a folder named `user_defined` in [prepare/output](https://github.com/nyuvis/SuRE/prepare/output)
- Move the `user_defined` folder to `webapp/data/`

#### 2.2 Run the server

- Open the terminal at the directory of  `webapp`
- Install necessary python libraries:
  - run `pip install --upgrade -r requirements.txt`
- Run the server: 
  - run the command line `python server/server.py`. Please notice that the code is for python 3. And in some system, you may need to run the command `python3 server/server.py`.
- Visit the web application at `localhost:6060/index.html`.

By default, the system show the data of a loan application dataset. If you want to test your own data, you can put the folder containing your data files under `data`, and rename your data folder as `default`. 

