from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


from app.routers import auth, reports

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(reports.router)


@app.get("/")
def root():
    return {"status": "Backend running"}
