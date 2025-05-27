from fastapi import FastAPI

app = FastAPI()

@app.get("/embedding")
def get_embedding():
    return {"message": "This is an embedding endpoint"}