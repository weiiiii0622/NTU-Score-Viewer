import { addMessageListener, getStorage, sendTabMessage, setStorage } from "./api";
import { DefaultService, OpenAPI } from "./client";
import { QueryGradeBatcher } from "./queryGradeBatcher";
import { serviceHandler } from "./serviceHandler";
import { getDataFromURL, injectContentScriptIfNotRunning, setCursorWaitWhilePending, sleep } from "./utils";

OpenAPI['BASE'] = APP_URL

// todo: notification, omnibox, commands

/* ---------------------------------- User ---------------------------------- */


addMessageListener('user', async (msg, sender) => {
   const token = await getStorage('token');
   if (!token)
      return null;
   try {
      const user = await DefaultService.getUserUserGet({ token })
      return user
   } catch {
      return null
   }
});

addMessageListener('session_id', async (msg, sender) => {

   const _ga = await chrome.cookies.getAll({ domain: '.ntu.edu.tw', name: '_ga' });
   const ASP_NET_SessionId = await chrome.cookies.getAll({ domain: 'if190.aca.ntu.edu.tw', name: 'ASP.NET_SessionId' });
   const TS01c67bb5 = await chrome.cookies.getAll({ domain: '.if190.aca.ntu.edu.tw', name: 'TS01c67bb5' });
   const _ga_X3821T0R42 = await chrome.cookies.getAll({ domain: '.ntu.edu.tw', name: '_ga_X3821T0R42' });

   //console.log(_ga);
   //console.log(ASP_NET_SessionId);
   //console.log(TS01c67bb5);
   //console.log(_ga_X3821T0R42);

   let cookie = '';
   cookie += `_ga=${_ga.length ? _ga[0].value : ""}; `
   cookie += `ASP.NET_SessionId=${ASP_NET_SessionId.length ? ASP_NET_SessionId[0].value : ""}; `
   cookie += `TS01c67bb5=${TS01c67bb5.length ? TS01c67bb5[0].value : ""}; `
   cookie += `_ga_X3821T0R42=${_ga_X3821T0R42.length ? _ga_X3821T0R42[0].value : ""}; `
   return cookie
});




/* ----------------------------- Service Handler ---------------------------- */


global.batcher = new QueryGradeBatcher();
addMessageListener('service', serviceHandler);


// addMessageListener('service', async (msg, sender) => {

//    const { funcName, args } = msg;

//    const func = DefaultService[funcName];
//    let token = await getStorage('token');
//    if (token)
//       token = token.replaceAll('=', '%3D')

//    console.log(`service: ${funcName}`)

//    try {
//       // const response = funcName === 'queryGradesQueryGet'
//       //    ? await batcher.addTask(args)
//       //    : await func({ ...args, xToken: token } as any);


//       if (funcName === 'queryGradesQueryGet')
//          console.log(args, await batcher.addTask(args));
//       const response = funcName === 'queryGradesQueryGet'
//       await func({ ...args, xToken: token } as any);

//       console.log(`response: ( ${response} )`)

//       if (typeof response === 'object' && 'token' in response) {
//          const { token } = response;
//          await setStorage({ token })
//       }

//       return [response, null] as const;
//    } catch (e) {
//       if (e instanceof ApiError) {
//          return [null, { status: e.status, response: e.body } as ServiceError] as const;
//       }
//       else {
//          return [null, { status: 400, response: { detail: `UnhandledError: ${e}` } }] as const;
//       }
//    }
// })

/* ------------------------------ Context Menu ------------------------------ */

chrome.runtime.onInstalled.addListener(() => {
   chrome.contextMenus.create(
      {
         id: "selection",
         type: "normal",
         title: "搜尋 '%s' 的成績分布",
         contexts: ["selection"]
      },
   );
   chrome.contextMenus.create(
      {
         id: 'all',
         type: 'normal',
         title: `開啟 ${APP_TITLE} 面板`,
         contexts: ['page', 'frame'],
      }
   )
   // ! This is for test-only
   chrome.contextMenus.create(
      {
         id: 'report',
         type: 'normal',
         title: `Report issue`,
         contexts: ['page', 'frame'],
      }
   )
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
   if (info.menuItemId === 'report') {
      const image_data = await captureTab();
      const issue = await DefaultService.createIssueIssuesPost({
         requestBody: {
            description: 'Test issue',
            image_data,
         }
      })
      // ! test only
      chrome.tabs.create({ url: APP_URL + `/issues/${issue.id}/preview`, active: true });
      return;
   }

   openDialog(tab!, info.selectionText ?? '');

})


async function openDialog(tab: chrome.tabs.Tab, selection: string = '') {
   // todo: create new tab if current is chrome://
   if (tab.url?.startsWith('chrome://')) {
      tab = await chrome.tabs.create({ active: true, url: `http://www.google.com/?q=${selection}` })
      await sleep(1000);
   }

   setCursorWaitWhilePending(tab.id!, async () => {
      injectContentScriptIfNotRunning(tab.id!)
      await sendTabMessage(tab?.id!, 'dialog', { selection });
   })
}


// todo: jump to options on installed.


chrome.commands.onCommand.addListener(async (command, tab) => {
   openDialog(tab)


   // return;
   // setTimeout(() => {
   //    chrome.scripting.executeScript({
   //       target: { tabId: newTab.id! }, func: () => {
   //          document.body.style.background = 'red'
   //          console.log('hi')
   //       }
   //    })
   // }, 0)
});

/* ------------------------------- Capture Tab ------------------------------ */

async function captureTab() {
   return new Promise<string | null>(res => {
      chrome.tabs.captureVisibleTab().then((dataURL) => {
         res(getDataFromURL(dataURL))
      });
   })
}

addMessageListener('captureTab', async () => {
   return await captureTab();
})


chrome.runtime.onInstalled.addListener(async () => {

   return;

   chrome.notifications.create("new-notification", {
      iconUrl: "http://www.google.com/favicon.ico",
      type: 'list',
      title: 'Primary Title',
      message: 'Primary message to display',
      priority: 1,
      items: [{ title: 'Item1', message: 'This is item 1.' },
      { title: 'Item2', message: 'This is item 2.' },
      { title: 'Item3', message: 'This is item 3.' }]
   }, () => {
      console.log("notification",)
   })
})


addMessageListener('injectNTUCool', (_, sender) => {
   chrome.scripting.executeScript({
      target: { tabId: sender.tab?.id! }, files: [
         'js/NTUCool.js'
      ]
   })
})



addMessageListener('injectGradePage', (_, sender) => {
   console.log('hi')
   chrome.scripting.executeScript({
      target: { tabId: sender.tab?.id! }, files: [
         'js/gradePage.js'
      ]
   })
})

addMessageListener('getTabId', async (_, sender) => {
   // (await getStorage('redirectChartIds'))?.add(sender.tab!.id!);
   return sender.tab!.id!;
   // chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
   //    if (info.status === 'complete' && tabId === sender.tab?.id) {
   //       chrome.tabs.onUpdated.removeListener(listener);

   //       chrome.scripting.executeScript({
   //          target: { tabId: sender.tab?.id! }, files: [
   //             'js/NTUCool.js'
   //          ],
   //       })
   //    }
   // });
})


chrome.runtime.onInstalled.addListener(async () => {
   const res = await getStorage('hasShownNTUCoolTour');
   if (!res)
      setStorage({ 'hasShownNTUCoolTour': false })
})


// todo: omnibox
// chrome.omnibox.onInputStarted.addListener(function () {
//    console.log('💬 onInputStarted');

//    chrome.omnibox.setDefaultSuggestion({
//       description:
//          "Here is a default <dim>dim</dim> <match>suggestion</match>. <url>It's <match>url</match> here</url>"
//    });
// });


// chrome.omnibox.onInputChanged.addListener(function (text, suggest) {
//    console.log('✏️ onInputChanged: ' + text);
//    suggest([
//       { content: text + ' one', description: 'the first one', deletable: true },
//       {
//          content: text + ' number two',
//          description: 'the second entry',
//          deletable: true
//       }
//    ]);
// });

const TUTORIAL_URL = 'https://weiiiii0622.github.io/NTU-Grade-Viewer/Tutorial/'
chrome.runtime.onInstalled.addListener((details) => {
   if (details.reason === 'install')
      chrome.tabs.create({ url: TUTORIAL_URL, active: true })
});
