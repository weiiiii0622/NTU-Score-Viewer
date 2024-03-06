import logging
import os
from contextlib import asynccontextmanager
from typing import Annotated
from urllib.parse import quote

import requests
import uvicorn
from api_analytics.fastapi import Analytics
from auth import get_token
from db import get_engine, get_session
from dotenv import load_dotenv
from errors import (
    BadRequestResponse,
    InternalErrorResponse,
    UnauthorizedErrorDetail,
    UnauthorizedErrorResponse,
    ValidationErrorResponse,
)
from fastapi import (
    Cookie,
    Depends,
    FastAPI,
    HTTPException,
    Path,
    Request,
    Response,
    status,
)
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from models import (
    Course,
    CourseReadWithGrade,
    GradeWithSegments,
    Id1,
    SemesterStr,
    StudentId,
    User,
)
from routes import get_routers
from routes.submit import parse_page
from sqlalchemy import text
from sqlmodel import Session, select
from utils.grade import get_grade_element
from utils.route import APP_MODE, admin_required, is_admin, test_only, wrap_router
from utils.static import get_static_path
from utils.validate_env import validate_env

load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"), override=True)

if os.getenv("APP_MODE") == "DEV":
    os.environ["APP_URL"] = "http://localhost:5000"


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger = logging.getLogger("uvicorn")
    if not validate_env():
        logger.error("Your .env file does not match .env.sha256.")
        logger.error(
            "Perhaps your environment variables are out-dated and may cause runtime error."
        )
    else:
        logger.info("Checked .env file, up-to-date.")

    yield


app = FastAPI(
    responses={
        400: {"model": BadRequestResponse},
        401: {"model": UnauthorizedErrorResponse},
        422: {"model": ValidationErrorResponse},
        500: {"model": InternalErrorResponse},
    },
    lifespan=lifespan,
)
wrap_router(app.router)

app.mount("/static", StaticFiles(directory=get_static_path()), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if os.getenv("APP_MODE") == "PROD":
    if api_key := os.getenv("APP_ANALYTICS_KEY"):
        app.add_middleware(Analytics, api_key=api_key)


# for router in routes.ROUTERS:
#     print(router.prefix)
for router in get_routers():
    app.include_router(router, include_in_schema=True)


@app.get("/course/{id1}")
def get_course(*, session: Session = Depends(get_session), id1: Id1) -> CourseReadWithGrade:
    course = session.exec(select(Course).where(Course.id1 == id1)).one_or_none()
    if not course:
        raise HTTPException(404)
    grades = [GradeWithSegments.model_validate(get_grade_element(g)) for g in course.grades]
    return CourseReadWithGrade(**course.model_dump(), grades=grades)


# ---------------------------------- Config ---------------------------------- #


@app.get("/semester")
def get_semester() -> SemesterStr:
    return os.getenv("CONFIG_SEMESTER", "111-2")


@app.get("/time-to-live")
def get_TTL() -> int:
    """
    Time-to-live in seconds.
    """
    ttl = int(os.getenv("CONFIG_TTL", 1800))
    return ttl


# ----------------------------------- Test ----------------------------------- #


@app.get("/")
def get_root():
    return "HELLO ROOT"


@app.get("/db")
@test_only
def db_test():
    return Session(get_engine()).execute(text("SELECT 'HELLO WORLD'")).scalar()


@app.get("/add-auth/{student_id}")
@test_only
def _add_auth(
    *,
    session: Session = Depends(get_session),
    student_id: Annotated[StudentId, Path(description="A student's id, e.g. b10401006.")],
    response: Response,
):
    """
    Add a user to database. This will set `token` in cookies.

    Returns:
        Token generated by given student id.
    """
    user = User(id=student_id, last_semester="112-1")
    session.add(user)
    session.commit()

    token = get_token(student_id)
    response.set_cookie("cookie_token", quote(token))
    return token


# @app.exception_handler(500)
async def internal_error_handler(request: Request, exc: Exception):
    try:
        exc.__class__.__name__
        # todo: hide error message in production
        resp = InternalErrorResponse(detail=f"{exc.__class__.__name__}: {exc.args}")
        # todo: why is args of validation error empty
        return JSONResponse(resp.model_dump(), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except:
        return JSONResponse({}, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@app.exception_handler(RequestValidationError)
async def request_validation_error(request: Request, exc: RequestValidationError):
    # print(await request.body())
    raise HTTPException(422, detail=exc.args[0])


# @app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    print(f"HTTPException: {exc.args}")
    print(exc.detail)
    try:
        match exc.status_code:
            case 401:
                try:
                    detail = UnauthorizedErrorDetail(type=exc.detail)  # type: ignore
                except:
                    detail = UnauthorizedErrorDetail(type="invalid")
                resp = UnauthorizedErrorResponse(detail=detail)
            case 422:
                resp = ValidationErrorResponse(detail=exc.detail)  # type: ignore
            case _:
                resp = BadRequestResponse(detail=f"HTTPException ({exc.status_code}): {exc.detail}")
    except:
        resp = BadRequestResponse(detail=f"HTTPException ({exc.status_code}): {exc.detail}")

    return JSONResponse(resp.model_dump(), status_code=exc.status_code)


# ---------------------------------- Utility --------------------------------- #


@app.get("/analytics")
@admin_required
def get_analytics():
    if api_key := os.getenv("APP_ANALYTICS_KEY"):
        user_id = requests.get(f"https://www.apianalytics-server.com/api/user-id/{api_key}").text
        user_id = user_id[1:-1].replace("-", "")  # get rid of quote
        url = f"https://www.apianalytics.dev/dashboard/{user_id}"
        return RedirectResponse(url)

    return HTTPException(404, "Oops")


@app.get("/analytics/dialog")
def get_dialog():
    """
    Only for analytics purpose.
    The extension will fetch this endpoint every time dialog is opened.
    """
    return


from admin import site

if site:
    site.mount_app(app)
else:
    print("no site QQ")


ADMIN_PATHS = ["/admin", "/static"]


@app.middleware("http")
async def admin_auth(request: Request, call_next):
    if any(request.url.path.startswith(path) for path in ADMIN_PATHS):
        # and APP_MODE == 'PROD':
        if not is_admin(request.cookies.get("admin")):
            return JSONResponse("You don't belong here 👻", status_code=401)
    response = await call_next(request)
    return response


# ----------------------------------- Main ----------------------------------- #

PORT = int(os.getenv("PORT_DEV", 4000))
if __name__ == "__main__":
    uvicorn.run("app:app", port=PORT, host="0.0.0.0", reload=True)
