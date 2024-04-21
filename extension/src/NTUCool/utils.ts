function byId<T extends HTMLElement>(id: string) {
    return document.querySelector<T>(`#${id}`);
}
function byIds<T extends HTMLElement>(id: string) {
    return document.querySelectorAll<T>(`#${id}`);
}

function byClass<T extends HTMLElement>(className: string) {
    return document.querySelector<T>(`.${className}`);
}

function byClasses<T extends HTMLElement>(className: string) {
    return document.querySelectorAll<T>(`.${className}`);
}

export { byId, byIds, byClass, byClasses };

export const $: (s: string) => HTMLElement =
    document.querySelector.bind(document);
export const $$: (s: string) => NodeListOf<HTMLElement> =
    document.querySelectorAll.bind(document);

export function hide(selector: string) {
    $$(selector).forEach((e) => (e.style.visibility = "hidden"));
}

export function show(selector: string) {
    $$(selector).forEach((e) => (e.style.visibility = "visible"));
}

export const PAGE_TITLE = "成績分布";

type APIResponse = {
    id: number;
    name: string;
    account_id: number;
    uuid: string;
    // start_at: null;
    // grading_standard_id: 0;
    // is_public: null;
    created_at: string;
    course_code: string;
    original_name?: string;
};

export async function fetchApi(id: string): Promise<APIResponse> {
    const res = await fetch(
        `https://cool.ntu.edu.tw/api/v1/courses/${id}`
    ).then((r) => r.json());
    return res as any;
}

// todo: use syllabus to get lecturer
export async function getCourseInfo(id: string) {
    // e.g. "神經解剖學 (MED3057)"
    const RE_COURSE_CODE = /(.+)\s\((.+?)(-(.+))?\)/;

    // const res = await fetch(
    //     `https://cool.ntu.edu.tw/api/v1/courses/${id}`
    // ).then((r) => r.json());
    const res = await fetchApi(id);
    const courseCode: string = res.course_code;
    const obj = courseCode.match(RE_COURSE_CODE);
    if (!obj) throw `Invalid courseCode: ${courseCode}`;

    const [_, title, id1, __, classId] = obj;
    return { title, id1 };
}

export const RE_COURSE = /https:\/\/cool.ntu.edu.tw\/courses\/(\d+)/;
export const RE_CHARTS = /https:\/\/cool.ntu.edu.tw\/courses\/(\d+)\/charts/;

export function getCourseURL(id: string) {
    return `https://cool.ntu.edu.tw/courses/${id}/`;
}
export function getChartsPath(id: string) {
    return `/courses/${id}/charts`;
}

export function matchCourseId(
    url: string
): [string, true] | [string | undefined, false] {
    let obj = url.match(RE_CHARTS);
    if (obj) return [obj[1], true];
    return [url.match(RE_COURSE)?.at(1), false];
}
