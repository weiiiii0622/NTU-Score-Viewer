
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Tour, TourContent, TourTarget } from "../components/tour";

import { setStorage } from "../api";
import { useStorage } from "../hooks/useStorage";
import { IconX } from "@tabler/icons-react";
import { PAGE_TITLE, hide, show } from "./utils";
import { showChart } from "./chart";
import { cn } from "../utils";




export function SideBarBtn({ id, active }: { id: string, active: boolean }) {

   const [loading, hasShown] = useStorage('hasShownNTUCoolTour');
   useEffect(() => {
      // if (!loading && !hasShown)
      // setStorage({ hasShownNTUCoolTour: true })
      if (!loading)
         setOpen(!hasShown);
      if (!hasShown) {
         window.scrollTo(0, 0);
      }
   }, [hasShown, loading]);


   const [open, setOpen] = useState(false);
   function close() {
      setOpen(false);
      setStorage({ 'hasShownNTUCoolTour': true });
   }


   return <Tour
      open={open}
      onOpenChange={setOpen}
   // todo: delay
   >
      <TourTarget asChild>
         <a className={cn("duration-200  slide-in-from-left-1 fade-in-0 animate-in cursor-pointer charts", active && "active")} tabIndex={0}
            onClick={() => {
               history.pushState({ id }, '', `/courses/${id}/charts`)
               showChart(id);
            }}
         >{PAGE_TITLE}</a>
      </TourTarget>
      <TourContent >
         <div className="flex items-center justify-center px-10 py-8 overflow-hidden bg-white rounded-lg ">
            <div className="absolute cursor-pointer right-4 top-4"
               onClick={close}
            >
               <IconX size={20} />
            </div>
            歡迎使用 {APP_TITLE} 🤗
            <br />
            你可以在這裡看到此課程的成績分布，快試試看吧！
         </div>
      </TourContent>
   </Tour>
}

// todo: reload
// todo: files page crumbs
// todo: modify crumbs
export async function addSideBarBtn(id: string, active: boolean) {
   const tabsId = '#section-tabs'
   // hide(tabsId);
   const sideBar = document.querySelector(tabsId)!;
   if (sideBar.querySelector('.charts'))
      return;

   console.log('add!')
   function onBtnClick() {
      history.pushState({ id }, '', `/courses/${id}/charts`)
      showChart(id);
   }

   const newBtn: HTMLElement = sideBar.lastChild!.cloneNode(true) as HTMLElement;
   // const anchor = newBtn.querySelector('a')!
   // anchor.removeAttribute('href')
   // anchor.className = "charts"
   // anchor.innerText = '成績分布'
   // anchor.style.cursor = 'pointer';
   // newBtn.onclick = onBtnClick;
   newBtn.innerHTML = '';
   sideBar.appendChild(newBtn);

   // const root = document.createElement("div");
   console.log(id)
   createRoot(newBtn).render(
      <React.StrictMode>
         <SideBarBtn id={id} active={active} />
      </React.StrictMode>
   );
   // show(tabsId);
}