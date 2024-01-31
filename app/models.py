from abc import ABC
import base64
from dataclasses import dataclass, field
import hashlib
import math
import re
from typing import Annotated, Iterable, Literal, Optional, TypeAlias
from fastapi.exceptions import RequestValidationError
from pydantic import (
    AfterValidator,
    BaseModel,
    Field,
    ValidationError,
    field_validator,
    model_validator,
    validator,
)

from utils import hashCode


# ---------------------------------- Course ---------------------------------- #


Id1: TypeAlias = Annotated[str, Field(pattern=r".+?\d+", description="'課號', e.g. 'CSIE1212'")]  #
Id2: TypeAlias = Annotated[
    str,
    Field(
        pattern=r".{3}\s.{5}", description="'課程識別碼', e.g. '902 10750'. Note the space character."
    ),
]  #


# @dataclass
class Course(BaseModel):
    id1: Id1
    id2: Id2
    title: str


# ----------------------------------- Grade ---------------------------------- #

# Semester: TypeAlias = tuple[Annotated[int, Field(ge=90, le=130)], Annotated[int, Field(ge=1, le=2)]]
# def to_semester(s: Annotated[str, Field(pattern=r"\d+-\d+")]) -> Semester:
#     return tuple(map(int, s.split("-")))  # type: ignore


# ? Change to this def. because I cannot fix openapi tuple issue🥲
def validate_semester(s: str):
    a, b = list(map(int, s.split("-")))
    if 130 >= a >= 90 and 2 >= b >= 1:
        return s
    raise ValidationError()


Semester = Annotated[
    str, Field(description="semester", pattern=r"\d+-\d+"), AfterValidator(validate_semester)
]


GRADES = ("A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "F")
# A+: 9, A: 8, ..., F: 0
# The order is for segment list to make more sense
GRADE_MAP = {grade: i for grade, i in enumerate(reversed(GRADES))}
GRADE_MAP_INV = {i: grade for grade, i in enumerate(reversed(GRADES))}

GradeInt: TypeAlias = Annotated[
    int,
    Field(
        ge=0,
        lt=len(GRADES),
        description="An integer between [0, 9], representing a grade. Example: 0 -> F, 9 -> A+.",
    ),
]


def validate_grade_str(s: str):
    if s in GRADES:
        return s
    raise ValidationError()


GradeStr: TypeAlias = Annotated[str, AfterValidator(validate_grade_str)]


# @dataclass
class GradeBase(ABC, BaseModel):
    course_id1: Annotated[str, Field(pattern=r".+?\d+")] = Field(
        description="'課號', e.g. CSIE1212", examples=["CSIE1212"]
    )
    semester: Semester = Field(description="Semester between 90-1 ~ 130-2", examples=["111-2"])

    # TODO: use scraper to get lecturer
    lecturer: Optional[str] = Field(
        description="The lecturer.", examples=["林軒田"], default=None
    )  # ! this can not be obtained from page

    # TODO: consider using default ''
    class_id: Optional[str] = Field(description="'班次'", examples=["01"], default=None)


# @dataclass
class GradeInfo(GradeBase):
    """
    Grade information extracted from user page submited. The values are between 0~100.
    """

    grade: GradeStr
    dist: tuple[float, float, float]  # lower, same, higher

    @validator("dist")
    def valid_dist(cls, v: tuple[float, float, float]):
        if math.isclose(sum(v), 100, abs_tol=1) and len(v) != 3:
            raise ValidationError()
        return v


# @dataclass
class Segment(BaseModel):
    """
    The distribution in the range [l, r].
    """

    l: GradeInt
    r: GradeInt
    value: float = Field(description="A float in [0, 100].")

    def __iter__(self):
        return iter((self.l, self.r, self.value))

    @staticmethod
    def from_iterable(x: Iterable):
        l, r, value = x
        return Segment(l=l, r=r, value=value)


# @dataclass
class GradeElement(GradeBase):
    """
    Grade element stored in db and consumed by client. The values are between 0~100.
    """

    segments: list[Segment] = Field(
        description="A list of segments. The segments are expected to be disjoint, and taking up the whole [0, 9] range. The sum is expected to be (nearly) 100."
    )
    id: Annotated[str, Field(min_length=16, max_length=16)] = Field(
        default="", description="A string generated by backend server."
    )

    def __init__(self, **data):
        super().__init__(**data)
        self.id = self.get_id()

    def get_id(self):
        return hashlib.sha256(
            repr((self.course_id1, self.class_id, self.semester)).encode()
        ).hexdigest()[:16]
        # ! python hash() only return same value in single-run
        # return hash((self.course_id1, self.class_id, self.semester)) % (1 << 31)

    @field_validator("segments")
    def valiadte_grade_eles(cls, v: list[Segment]):
        if not math.isclose(sum(grade.value for grade in v), 100, abs_tol=1):
            raise ValidationError
        for i in range(len(v) - 1):
            assert v[i].r + 1 == v[i + 1].l, v
        return v

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "course_id1": "CSIE1212",
                    "semester": "110-2",
                    "lecturer": "林軒田",
                    "class_id": "01",
                    "segments": [{"l": 0, "r": 8, "value": 91}, {"l": 9, "r": 9, "value": 9}],
                    "id": -1,
                }
            ]
        }
    }


class CourseGrade(BaseModel):
    """
    The response data for a query.
    """

    course: Course
    grade_eles: list[GradeElement]


# ----------------------------------- Query ---------------------------------- #

QUERY_FIELDS = ("id1", "id2", "title")
QueryField: TypeAlias = Literal["id1", "id2", "title"]
QUERY_FILTERS = ("class_id", "semester")
QueryFilter: TypeAlias = Literal["class_id", "semester"]


# ----------------------------------- Page ----------------------------------- #


class Page(BaseModel):
    """
    Page submitted by user.
    """

    content: str = Field(description="The html content of user's grade page.")
    hashCode: int = Field(description="Hashed value of `content`.")

    # @field_validator("content")
    @classmethod
    def parse_content(cls, v: bytes):
        return base64.decodebytes(v)

    # @model_validator(mode="after")
    def validate_hash(self):
        if self.hashCode != hashCode(self.content):
            raise RequestValidationError([])
        return self


# ----------------------------------- User ----------------------------------- #


def validate_student_id(id: str):
    if re.match(r"[a-zA-Z0-9]{9}", id):
        return id.capitalize()
    raise RequestValidationError([])  # TODO: is this error suitable?


StudentId = Annotated[
    str, Field(description="A student's id, e.g. b10401006."), AfterValidator(validate_student_id)
]
