import { NTUCoolState } from "./NTUCool";
import { TabAction, TabListenerState } from "./api";
import { QueryGradeBatcher } from "./queryGradeBatcher";

declare global {
    var APP_URL: string; // will be set by webpack DefinePlugin
    var APP_TITLE: string;
    var NTU_GRADE_VIEWER__APP_INDICATOR: HTMLElement & {
        setAttribute(name: TabAction, value: TabListenerState): void;
        setAttribute(name: "NTUCool", value: NTUCoolState): void;
        getAttribute(name: "NTUCool"): NTUCoolState;
    };
    // var DIALOG_READY: string;
    // var DIALOG_DISABLE_POINTER: string;

    var batcher: QueryGradeBatcher;
}

export {};

