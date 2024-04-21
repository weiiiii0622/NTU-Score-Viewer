/* -------------------------- Dialog (Context Menu) ------------------------- */

import { TabMessageMap, addMessageListener } from "../../api";
import { clamp, rgbToHex } from "../../utils";
import { DIALOG_HEIGHT, DIALOG_WIDTH, DIALOG_GAP } from "../config";
import { addContentMessageListener, sendFrameMessage } from "../message";

/* ------------------------------ Global States ----------------------------- */

let dialogActive: boolean = false;
let dialogPos: [number, number] = [0, 0];
let ready = false;

let mousePos: [number, number] = [0, 0];
window.addEventListener("mousemove", (event) => {
    const { clientX: x, clientY: y } = event;
    mousePos = [x, y] as const;
});

/* --------------------------- Handling Positions --------------------------- */

function getDefaultPosition(): [number, number] {
    return [
        window.innerWidth / 2 - DIALOG_WIDTH / 2,
        window.innerHeight / 2 - DIALOG_HEIGHT / 2,
    ];
}

function getDialogPosition(): [number, number] {
    const getMousePosition = () => mousePos;

    const selection = window.getSelection();
    // if (!selection) return getMousePosition()
    if (!selection) return getDefaultPosition();

    const { isCollapsed } = selection;
    // todo: fix textarea/input
    // if (isCollapsed) return getMousePosition();
    if (isCollapsed) return getDefaultPosition();
    // console.log(isCollapsed)

    const range = selection.getRangeAt(0);
    let { x, y, height } = range.getBoundingClientRect();

    //console.log(x, y, height)

    if (y < window.innerHeight / 2)
        // pop from upside
        y += height + DIALOG_GAP;
    // pop from downside
    else y -= DIALOG_HEIGHT - DIALOG_GAP;

    x = Math.min(x, window.innerWidth - DIALOG_WIDTH);
    y = clamp(y, DIALOG_GAP, window.innerHeight - DIALOG_HEIGHT - DIALOG_GAP);

    //console.log('x, y: ', x, y)
    return [x, y];
}

// todo: maybe use snackbar for initial loading
// todo: refactor

function getBgColor() {
    function toRgb(s: string): [number, number, number] {
        try {
            return s
                .match(/\((.*)\)/)![1]
                .split(",")
                .slice(0, 3)
                .map((x) => parseInt(x)) as [number, number, number];
        } catch {
            return [255, 255, 255];
        }
    }

    return rgbToHex(
        toRgb(
            window
                .getComputedStyle(document.body, null)
                .getPropertyValue("background-color")
        )
    );
}

const frame = document.createElement("iframe");
const frameURL = chrome.runtime.getURL("dialog.html");

function initFrame() {
    const bgColor = getBgColor();
    console.log("bg: ", bgColor);

    frame.src = frameURL + `?bgColor=${encodeURIComponent(bgColor)}`;
    document.body.insertBefore(frame, null);
    frame.setAttribute(
        "style",
        `position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: transparent;
        border: none;`
    );
    frame.contentWindow?.focus();
}
function closeFrame() {
    // frame.contentWindow?.postMessage('close', frameURL);
    sendFrameMessage(frame, "close", undefined);
    dialogActive = false;
}

function isInFrame(x: number, y: number) {
    // const l = parseFloat(frame.style.left), r = l + DIALOG_WIDTH, t = parseFloat(frame.style.top), b = t + DIALOG_HEIGHT;
    // console.log(dialogPos);
    const [x0, y0] = dialogPos;
    const l = x0,
        r = l + DIALOG_WIDTH,
        t = y0,
        b = t + DIALOG_HEIGHT;
    const inFrame = l <= x && x <= r && t <= y && y <= b;

    // console.log(inFrame, "(content)");
    // console.log(l, r, t, b)
    // console.log(x, y);
    return inFrame;
}

export function initDialog() {
    initFrame();

    // todo: use esc to close
    // * Handle blur events
    const blurEvents: (keyof WindowEventMap)[] = [
        "click",
        // todo: add infinite scroll in card container?
        // 'scroll'
    ];
    for (let name of blurEvents) {
        window.addEventListener(name, (e) => {
            //console.log('window', name)
            if (frame.style.pointerEvents === "none") {
                // todo: toggle this
                // closeFrame();
            } else e.preventDefault(); // not working for scroll
        });
    }
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeFrame();
    });

    // * Update pointer-events
    window.addEventListener("mousemove", (e) => {
        const x = e.clientX,
            y = e.clientY;
        const inFrame = isInFrame(x, y);
        frame.style.pointerEvents = dialogActive && inFrame ? "auto" : "none";
        // if (dialogActive && inFrame)
        //    document.body.style.overflow = 'hidden';
    });

    // * Handle messages
    addContentMessageListener("ready", () => {
        if (!ready) {
            ready = true;
            const handler = (msg: TabMessageMap["dialog"]["msg"]) => {
                const { selection } = msg;
                const position = getDialogPosition();
                //console.log('dialog')
                // frame.contentWindow?.postMessage({ ...msg, position }, frameURL);
                frame.style.zIndex = "9999";
                sendFrameMessage(frame, "open", { selection, position });
            };
            addMessageListener("dialog", handler);
        }
    });
    addContentMessageListener("position", (position) => {
        dialogPos = position;
    });
    addContentMessageListener("disablePointer", () => {
        frame.style.pointerEvents = "none";
    });
    addContentMessageListener("active", (active) => {
        dialogActive = active;
    });

    // type MessageAction = typeof DIALOG_POSITION | typeof DIALOG_READY;
    // window.addEventListener('message', (e: MessageEvent<{ action: DialogAction, position: [number, number], active: boolean }>) => {

    //     // console.log("receive message (content): ", e.data);
    //     if (typeof e.data === 'object' && 'action' in e.data) {
    //         switch (e.data['action']) {
    //             case DialogAction.Ready:
    //                 if (!ready) {
    //                     ready = true;
    //                     addMessageListener('dialog', handler)
    //                 }
    //                 break;
    //             case DialogAction.Position:
    //                 const { position } = e.data;
    //                 dialogPos = position;
    //                 // frame.style.left = `${left}px`;
    //                 // frame.style.top = `${top}px`;
    //                 break;
    //             case DialogAction.DisablePointer:
    //                 frame.style.pointerEvents = 'none';
    //                 // document.body.style.overflow = 'scroll';
    //                 break;
    //             case DialogAction.Active:
    //                 const { active } = e.data;
    //                 dialogActive = active;
    //                 break;
    //             default:
    //                 assertUnreachable(e.data['action']);

    //         }
    //     }
    // })
}
