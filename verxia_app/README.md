# Verxia — Cryptocurrency Scam Risk Detection Platform
Verxia is a comprehensive prototype created in tandem with this dissertation to illustrate how the trained machine-learning models can be utilized via a straightforward web application.

The application employs the trained .joblib models and test data set aside that was created as part of the dissertation. The application displays results such as risk scores, model performance, feature importance, and risk-band distributions, all generated from the trained models and test data, instead of being manually inputted or hardcoded.

The web application serves as another example of the project. It wasn't a necessary component of the initial proposal, which mainly concentrated on creating and assessing the machine-learning models.

Live Application

ComponentURLFrontend[https://verxia-frontend.onrender.com](https://verxia-frontend.onrender.com/)Backend API[https://verxia-backend.onrender.com](https://verxia-backend.onrender.com/)Health Check[https://verxia-backend.onrender.com/api/health](https://verxia-backend.onrender.com/api/health)The frontend and backend are hosted independently on Render.

The services in use utilize Render's hosting setup. Testing revealed that the backend could become unresponsive after around 10–15 minutes of inactivity. When this occurred, the initial request might take around 40 seconds as the backend service reactivated.

To minimize this delay in testing and demonstration, UptimeRobot was set up to routinely access the backend API, roughly every five minutes. This maintains consistent operations on the backend and decreases the chances of the service remaining inactive for an extended duration.

## Running Verxia Locally
The backend and frontend need to run at the same time in two separate terminals.

### 1. Start the Backend
From the `verxia_app/backend` directory:

```
cd backend
pip install -r requirements.txt
python app.py
```
The Flask API will run on:

```
http://localhost:5001
```
Leave this terminal running.

To check that the backend is working, open:

```
http://localhost:5001/api/health
```
The expected response is:

```
{"status":"ok"}
```

### 2. Start the Frontend
In a second terminal, go to the frontend directory:

```
cd frontend
npm install
npm run dev
```
The React application will normally be available at:

```
http://localhost:5173
```
Open this address in a browser to use Verxia.

For local development, the frontend connects to:

```
http://localhost:5001/api
```
When deployed, the frontend uses the deployed Flask backend API URL.

## What the Application Does
Verxia offers an easy-to-use interface for evaluating the trained models with reserved test data.

The individual can:

- Choose either the Elliptic dataset, which pertains to Bitcoin transactions, or the Ethereum dataset, which relates to Ethereum accounts.
- Choose a transaction or account from the reserved test data.
- Select either Random Forest or Logistic Regression.
- Conduct an assessment and obtain a risk score ranging from 0 to 1.
- Observe the relevant Low, Medium, or High risk category.
- Evaluate the effectiveness of the two machine-learning models.
- Examine the importance of features in Random Forest.
- Examine the allocation of risk categories within the test dataset.
- The application shows sample IDs obtained from the reserved test data. They are not examples created by hand.

## Model Comparison
The application displays the main evaluation metrics for both models, including:

- Accuracy
- Precision
- Recall
- F1-score
- ROC-AUC
These figures are derived from the assessment of the model conducted during the dissertation.

## Feature Importance
In the Random Forest model, Verxia presents the key features utilized by the model during its prediction process.

This offers a clearer perspective on which factors have the greatest impact on the model's classification.

## Risk-Band Distribution
The application determines the spread of Low, Medium, and High risk cases within the test dataset.It likewise illustrates the true ratio of illegal or deceitful cases within every risk category. This offers an alternative method for analyzing how the model distinguishes between lower-risk and higher-risk cases.

## Project Structure

```
verxia_app/
│
├── backend/
│   ├── app.py                  # Flask API
│   ├── requirements.txt
│   ├── models/                 # Trained .joblib models
│   └── data/                   # Test datasets
│       ├── elliptic_test.csv
│       └── ethereum_test.csv
│
└── frontend/
    ├── src/
    │   ├── App.jsx             # Main React component
    │   └── App.css
    └── package.json
```
The code for developing and training machine learning is found in the Jupyter notebooks located in the ML_Pipeline part of the project.

The CSV files serve as data resources instead of source code. They encompass unprocessed data, processed data, training and evaluation datasets, as well as outcomes produced through the machine-learning procedure.

API Endpoints

EndpointMethodPurpose`/api/health`GETChecks whether the backend is running`/api/model_comparison`GETReturns model performance metrics`/api/feature_importance/<dataset>`GETReturns Random Forest feature importance`/api/risk_distribution/<dataset>`GETCalculates risk-band distribution`/api/samples/<dataset>?n=200`GETReturns sample IDs from the test dataset`/api/predict`POSTRuns a prediction for a selected transaction/accountFor example, the prediction endpoint receives information such as:

```
{
  "dataset": "ethereum",
  "id": "...",
  "model": "rf"
}
```
The backend then loads the selected trained model and returns the calculated risk score and risk band.

## Machine-Learning Models
The application uses the trained models to develope as its the part of the dissertation's `ML_Pipeline`.

### Logistic Regression
Logistic Regression served as the foundational classification model. Feature scaling and class weighting were utilized during the model development phase to accommodate the traits of the datasets.

### Random Forest
The second classification model employed was Random Forest. It was utilized to create the feature-importance visualization shown in the Verxia application.

The application retrieves the saved trained models instead of retraining them each time a prediction is needed.

## Deployment
Verxia is deployed using two separate Render services:

ServiceTypeDescriptionFrontendStatic SiteReact/Vite frontendBackendWeb ServiceFlask API served using GunicornThe overall structure is:

```
User
  │
  ▼
React Frontend
  │
  ▼
Flask REST API
  │
  ├── Logistic Regression
  ├── Random Forest
  ├── Elliptic test data
  └── Ethereum test data
```
The frontend provides the user interface, while the Flask backend handles model predictions and related calculations.

### Backend Availability
During the deployment testing, it was discovered that the backend became inactive after roughly 10–15 minutes of no requests. This caused a delay of around 40 seconds when the backend needed to reactivate.

This was a problem related to hosting instead of an issue with the machine-learning models or the React frontend.

To lessen the impact of this problem, UptimeRobot was set up to request the backend roughly every five minutes. This ensures consistent activity and assists in maintaining backend availability throughout testing and demonstrations.

## Notes for the Dissertation
The true_label provided by the prediction endpoint is included for illustrative and assessment reasons. It enables the anticipated risk to be examined in conjunction with the established label from the excluded test data.

In an actual deployment, the genuine label is typically unavailable when evaluating a new transaction or account. The model would rather offer an estimated risk according to the information at hand.

The Verxia app was created to serve as another practical showcase of machine-learning efforts. The accepted proposal concentrated on creating and assessing the predictive models instead of implementing them as a web application.

The application underwent end-to-end testing, with the frontend and backend interacting via the Flask API. The testing process involved verifying the backend health endpoint, issuing HTTP requests to the prediction API, and ensuring that the trained models provided predictions via the web interface.
