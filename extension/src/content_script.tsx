import React, { useState } from "react";
import { waitUntil, submitPage, clamp, rgbToHex } from "./utils";
import { createRoot } from "react-dom/client";
import { GradeChartLoader } from "./components/gradeChartLoader";
import { TabAction, TabListenerState, TabMessageMap, addMessageListener, getStorage, setStorage, sendRuntimeMessage } from "./api";
import { SnackBar, ISnackBarProps } from "./components/snackBar";
import { initDialog } from "./dialog/content";


/* --------------------------- Initialze indicators ------------------------- */

function initIndicators() {
   const key = "NTU_GRADE_VIEWER__APP_INDICATOR";

   const node = document.createElement('div');
   node.id = key;
   node.style.visibility = 'hidden';
   document.body.insertBefore(node, null);

   const listenerStates: { [K in TabAction]: TabListenerState } = {
      'dialog': 'pending',
      'snackBar': 'pending',
      'submitPage': 'pending',
      'openPopup': 'pending',
   };
   Object.entries(listenerStates).forEach(([k, v]) => {
      window[key].setAttribute(k, v);
   })
}
initIndicators();


/* --------------------------------- Submit --------------------------------- */

addMessageListener('submitPage', async (msg, sender) => {
   return await submitPage();
})

/* --------------------------------- Dialog --------------------------------- */

initDialog();

/* ------------------------------ Popup Message ----------------------------- */

// todo: root should only be created once
addMessageListener('snackBar', (msg: ISnackBarProps) => {
   //console.log('add snackBar')
   const root = document.createElement("div");
   createRoot(root).render(
      <React.StrictMode>
         <SnackBar msg={msg.msg} severity={msg.severity} action={msg.action} />
      </React.StrictMode>
   );
   document.body.append(root);
});

/* -------------------------------- NTU Cool -------------------------------- */

async function NTUCoolFeature() {
   console.log(window.location.href.endsWith('?charts'))
   // if (window.location.href.endsWith('?charts'))
   //    document.body.querySelector<HTMLElement>('#application')!.style.visibility = 'hidden';
   console.log("NTUCool")
   sendRuntimeMessage('injectNTUCool', undefined);
}

registerFeature(NTUCoolFeature, 'https://cool.ntu.edu.tw/')

/* -------------------------------- Cookies --------------------------------- */

function checkCookie(cookieName: string) {
   let cookies = document.cookie.split(';');

   for (let i = 0; i < cookies.length; i++) {
      if (cookies[i].trim().indexOf(cookieName + '=') === 0) {
         return true;
      }
   }
   return false;
}

/* ------------------------------ Search Items ------------------------------ */

function initSearchItem(node: HTMLElement, isAuth: boolean) {
   if (node.getAttribute("inited") === "true") {
      //console.log(node, "is inited");
      return;
   }

   const root = document.createElement("span");
   root.className = "mui-ahcpjm";

   const childList = node.querySelectorAll(".MuiBox-root");
   const title = childList[1].childNodes[0].textContent;                            // 課程名稱
   const course_id1 = childList[0].childNodes[0].childNodes[1].textContent;         // 課號
   const course_id2 = childList[0].childNodes[0].childNodes[2].textContent;         // 識別碼
   let class_id = "";                                                               // 班次
   const lecturer = childList[2].childNodes[0].childNodes[0].textContent;

   const infos = childList[1].childNodes[1].childNodes;
   infos.forEach((info, idx) => {
      if (info.textContent?.startsWith("班次")) {
         class_id = info.textContent.slice(3);
      }
   })

   createRoot(root).render(
      <React.StrictMode>
         <GradeChartLoader auth={isAuth} title={title == null ? "" : title} course_id1={course_id1 == null ? "" : course_id1} course_id2={course_id2 == null ? "" : course_id2} lecturer={lecturer == null ? "" : lecturer} class_id={class_id == null ? "" : class_id} />
      </React.StrictMode>
   );
   childList.item(childList.length - 1).prepend(root);
   node.setAttribute("inited", "true");
}


async function searchPageFeature() {

   const LIST = "ul.table";
   const ITEM = "li.MuiListItem-root";

   await waitUntil(() => !!document.querySelector(LIST));

   // Check Token
   let token = await getStorage('token');
   const isAuth = (token !== undefined);


   // Check TTL
   let TTL = await getStorage("ttl");
   if ((TTL && TTL.cache_time < Date.now() - TTL.value) || !TTL) {
      const [ttl, _2] = await sendRuntimeMessage("service", {
         funcName: "getTtlTimeToLiveGet",
         args: {},
      });
      if (ttl) {
         await setStorage({
            ttl: { value: ttl * 1000, cache_time: Date.now() },
         });
         // console.log("Set TTL", ttl);
      }
   }

   const optionButton: any = document.querySelectorAll(".mui-tpbkxp")[1];

   if (optionButton) {
      // TODO: restore user option setting
      let hasModified: boolean[] = [false, false, false, false, false, false, false, false, false, false, false]
      optionButton.click()
      await waitUntil(() => !!document.querySelector(".mui-12efj16"));
      const options = document.querySelector(".mui-12efj16")
      options?.childNodes.forEach((option: any, idx) => {
         // if (!option.childNodes[0].childNodes[0].checked) {
         //    option.click();
         //    hasModified[idx] = true;   
         // }
         if (option.textContent.startsWith("班次") && !option.childNodes[0].childNodes[0].checked) {
            option.click();
            hasModified[idx] = true;
         }
      })
      optionButton.click()
   }

   const listParent = document.querySelector(LIST)!;
   listParent
      .querySelectorAll(ITEM)
      .forEach((node) => initSearchItem(node as HTMLElement, isAuth));

   function callback(mutations: MutationRecord[]) {
      mutations.forEach((m) => {
         m.addedNodes.forEach((node) => {
            if (node.nodeName !== "LI") {
               //console.log(`Got ${node.nodeName}, ignored`);
               return;
            }
            initSearchItem(node as HTMLElement, isAuth);
         });
      });
   }
   const ob = new MutationObserver(callback);
   ob.observe(listParent, { childList: true });
}

/* ---------------------------- Register Feature ---------------------------- */

//console.time('snack')

function registerFeature(fn: () => void, pattern: string | RegExp) {
   let previousUrl = "";

   const callback = () => {
      if (window.location.href !== previousUrl) {
         //console.log(`URL changed from ${previousUrl} to ${window.location.href}`);
         previousUrl = window.location.href;

         if (window.location.href.match(pattern)) {
            fn();
         }
      }
   }

   const observer = new MutationObserver(callback);
   observer.observe(document, { subtree: true, childList: true });

   callback();
}

console.log('content')
registerFeature(searchPageFeature, "https://course.ntu.edu.tw/search/")


function gradePageFeature() {
   sendRuntimeMessage('injectGradePage', undefined);
}
registerFeature(gradePageFeature, "https://if190.aca.ntu.edu.tw/graderanking");


// no-op
addMessageListener('openPopup', () => { });