/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export type Id1 = string;
export type Id2 = string;
export type Title = string;
/**
 * @minItems 2
 * @maxItems 2
 */
export type Semester = [number, number];
/**
 * @minItems 2
 * @maxItems 2
 */
export type Grade = string;
/**
 * @minItems 3
 * @maxItems 3
 */
export type Dist = [number, number, number];
export type L = number;
export type R = number;
export type Value = number;
/**
 * @minItems 2
 * @maxItems 2
 */
export type Segments = Segment[];
export type GradeEles = GradeElement[];
export type Content = string;
export type Hashcode = number;
export type Studentid = number;

export interface Course {
  id1: Id1;
  id2: Id2;
  title: Title;
}
export interface GradeBase {
  semester: Semester;
}
export interface GradeInfo {
  semester: Semester;
  grade: Grade;
  dist: Dist;
}
export interface Segment {
  l: L;
  r: R;
  value: Value;
}
export interface GradeElement {
  semester: Semester;
  segments: Segments;
}
/**
 * The response data for a query.
 */
export interface CourseGrade {
  course: Course;
  grade_eles: GradeEles;
}
/**
 * Page submitted by user.
 */
export interface Page {
  content: Content;
  hashCode: Hashcode;
}
