from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from songs import database_path, initialize_library, router as songs_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    path = database_path()
    initialize_library(path)
    app.state.song_db_path = path
    yield


app = FastAPI(lifespan=lifespan)
app.include_router(songs_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["Content-Type"],
)


@app.exception_handler(RequestValidationError)
async def handle_validation_error(request: Request, error: RequestValidationError):
    try:
        return await request_validation_exception_handler(request, error)
    except ValueError:
        # Rejected values such as infinity cannot be echoed in a JSON response.
        detail = [
            {key: issue[key] for key in ("loc", "msg", "type")}
            for issue in error.errors()
        ]
        return JSONResponse(status_code=422, content={"detail": detail})


class GreetingRequest(BaseModel):
    name: str


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/greet")
def greet(data: GreetingRequest):
    return {
        "message": f"Hello, {data.name}! This message comes from Python."
    }
