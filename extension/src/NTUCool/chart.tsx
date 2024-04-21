
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import { ServiceError, sendRuntimeMessage } from "../api";
import { InnerChartPage } from "../dialog/frame/chartPage";
import { CourseReadWithGrade } from "../client";
import { IconFolderX } from "@tabler/icons-react";
import { Loading } from "../dialog/frame/loading";
import { Error } from "../dialog/frame/error";
import { $, PAGE_TITLE, byClass, byId, fetchApi, getCourseInfo, matchCourseId } from "./utils";


function fixCrumb() {
   try {
      const crumbs = byClass('ic-app-nav-toggle-and-crumbs')!;
      if (crumbs.classList.contains('ic-app-nav-toggle-and-crumbs--files')) {
         crumbs.classList.remove('ic-app-nav-toggle-and-crumbs--files');
         byId('wrapper')!.insertBefore(crumbs, byId('wrapper')!.firstChild);
      }

      const nav = $('nav#breadcrumbs')!;
      const eles = nav.querySelectorAll("li");

      for (let i = 0; i < eles.length; i++) {

         if (i == 2) {
            const e = eles[i];
            const prev: HTMLElement = e.firstElementChild as HTMLElement;
            const [id, _] = matchCourseId(window.location.href);
            if (!id)
               continue;
            // e.innerText = PAGE_TITLE;

            e.style.position = 'relative';

            prev.className += ' [animation-fill-mode:forwards] absolute animate-out duration-200 fade-out-0 zoom-out-75'
            // ! doesn't work 🤬
            // prev.addEventListener('animationend', () => console.log('end'))
            // ! doesn't work either 
            // setTimeout(() => prev.remove(), 200);

            e.innerHTML += `
            <a href="/courses/${id}/charts"  class='  animate-in duration-200 slide-in-from-right-1/2 fade-in-0 absolute bg-white outline outline-2 outline-white' ><span class="ellipsible">${PAGE_TITLE}</a>
            `;
            // * now this work 🤩
            (e.lastElementChild as HTMLElement).addEventListener('animationend', function () {
               this.previousElementSibling?.remove();
            });
         }
         if (i > 2)
            eles[i].style.visibility = 'hidden';
      }
   } catch (e) { console.log(e) }
}

function setSidebarBtnActive() {

   try {
      const sideBar = byId("section-tabs")!;
      sideBar.querySelectorAll('a').forEach(e => {
         e.classList.remove('active');
      })
      sideBar.querySelector('a.charts')!.classList.add('active');
   } catch (e) {
      console.error(e)
   }
}

// todo: restore main style
// todo: manully revert style
export async function showChart(id: string) {
   const { original_name, name } = await fetchApi(id)
   document.title = `${PAGE_TITLE}： ${original_name ?? name}`

   fixCrumb();
   setSidebarBtnActive();

   const prevMain = document.querySelector<HTMLElement>('#not_right_side');
   if (!prevMain)
      return;

   const main = prevMain.cloneNode() as HTMLElement;
   prevMain.parentElement?.appendChild(main);
   // prevMain.parentElement?.style.overflowX = ''
   document.body.style.overflow = 'hidden';

   const { y } = prevMain.getBoundingClientRect();
   const center = (window.innerHeight - y) / 2 + y;
   const { width, height } = prevMain.getBoundingClientRect();
   prevMain.style.transformOrigin = `center ${center}px`;
   prevMain.className += ' absolute animate-out duration-300 fade-out-0 slide-out-to-top-2 '
   prevMain.style.width = `${width}px`;
   prevMain.style.height = `${height}px`;
   prevMain.addEventListener('animationend', function () { this.remove() })

   main.innerHTML = '';
   main.className = ' w-full h-full flex z-[9999] bg-white slide-in-from-right-1/2 justify-center flex-1 animate-in duration-300 fade-in-0 '
   main.parentElement?.setAttribute('style', "display: flex; flex-direction: column")

   const root = document.createElement("div");
   root.id = 'ntu-grade-viewer--root';
   root.classList.add('ntu-grade-viewer--preflight')
   root.setAttribute('style', `
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
   `)
   '<div class=" zoom-out-50 slide-in-from-bottom-1/2 slide-out-to-left-0"></div>'
   createRoot(root).render(
      <React.StrictMode >
         <Main id={id} />
      </React.StrictMode>
   );
   main.append(root);


   // if (window.location.href.endsWith('?charts'))
   //    document.body.querySelector<HTMLElement>('#application')!.style.visibility = 'visible';
}


/* ------------------------------- Components ------------------------------- */

function useCourse(id: string) {

   const [error, setError] = useState<ServiceError | null>(null);
   const [loading, setLoading] = useState(true);
   const [course, setCourse] = useState<CourseReadWithGrade>(null!);

   useEffect(() => {
      let canceled = false;
      setLoading(true);
      getCourseInfo(id).then(async ({ title, id1 }) => {
         if (canceled) {
            setLoading(false);
            return;
         }

         setLoading(true);
         const [course, err] = await sendRuntimeMessage('service',
            { funcName: 'getCourseCourseId1Get', args: { id1, caseSensitive: false } }
         )

         setLoading(false);
         if (canceled)
            return;
         if (err) {
            setError(err)
            return;
         }

         setCourse(course);
      })
   }, [id]);

   return [loading, error, course] as const;
}

function NotFound() {

   return <div className=" gap-4 flex flex-col items-center justify-center h-full text-[#888888]  text-xl">
      <IconFolderX size={128} color="#999999" stroke={0.4} style={{ transform: 'translateX(-5%)' }} />
      尚無此課程資料
   </div>
}



export function Main(props: { id: string }) {

   const { id } = props;
   const [loading, error, course] = useCourse(id);


   return <>
      <div className=" ntu-grade-viewer--preflight bg-white w-1/2 min-w-[500px] h-2/3 border border-solid border-[#dddddd]  rounded-xl shadow p-8 px-10">
         {loading
            ? <Loading />
            : !error
               ? <InnerChartPage
                  defaultChartType="pie"
                  defaultClassKey={null}
                  course={course}
               />
               : error.status === 404
                  ? <NotFound />
                  : <Error />
         }
      </div>
   </>
}

