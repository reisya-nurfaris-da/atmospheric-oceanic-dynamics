from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
import pickle

app = FastAPI(
    title="SARIMA Forecast Service",
    version="1.0",
    description="Serves up pre-trained SARIMA forecasts"
)

# load models
with open("sarima_models.pkl", "rb") as f:
    sarima_models = pickle.load(f)

# model schema
class ForecastRequest(BaseModel):
    variable: str
    periods: int

@app.get("/")
def root():
    return {
        "status": "running",
        "available_variables": list(sarima_models.keys())
    }

@app.post("/forecast")
def forecast(req: ForecastRequest):
    var, h = req.variable, req.periods
    if var not in sarima_models:
        raise HTTPException(404, f"Variable '{var}' not found.")
    model = sarima_models[var]
    pred = model.get_forecast(steps=h)
    fc   = pred.predicted_mean
    return {
        "variable": var,
        "forecast": [
            {"date": str(idx.date()), "value": float(val)}
            for idx, val in zip(fc.index, fc.values)
        ]
    }

# ---- new bits for dashboard ----
# 1) serve static files from ./static
app.mount("/static", StaticFiles(directory="static"), name="static")

# 2) templates directory for HTML
templates = Jinja2Templates(directory="templates")

@app.get("/dashboard")
def dashboard(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})
