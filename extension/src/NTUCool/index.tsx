
// import "../preflight_scoped.css"
import "./style.css"
import { addSideBarBtn } from "./sideBarBtn";
import { showChart } from "./chart";
import { getChartsPath, matchCourseId, show } from "./utils";


export type NTUCoolState = 'normal' | 'chart' | null;


export async function main() {
   const state = window.NTU_GRADE_VIEWER__APP_INDICATOR.getAttribute('NTUCool');
   if (state) {
      console.log('already running')
      return;
   }

   const [courseId, isCharts] = matchCourseId(window.location.href);
   window.NTU_GRADE_VIEWER__APP_INDICATOR.setAttribute('NTUCool', 'normal');
   const active = window.location.href.endsWith('?charts');

   if (courseId)
      await addSideBarBtn(courseId, active);

   if (courseId && active) {
      console.log('replace chart')
      showChart(courseId);
      show('#application')

      history.replaceState(null, '', getChartsPath(courseId));
   }

   // todo: I forgot why this QQ
   console.log("NTUCOOL", window.location.href)
   window.addEventListener('popstate', (ev) => {
      const [courseId, isCharts] = matchCourseId(window.location.href);
      if (isCharts)
         showChart(courseId);
      else
         window.location.replace(window.location.href);
   })
}

console.log("NTUCool loaded")

main();