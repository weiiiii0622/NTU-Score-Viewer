
import { createRoot } from "react-dom/client";
import "./style.css"


import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "./components/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger } from "./components/dialog";
import { useEffect, useState } from "react";
import { useStorage } from "./hooks/useStorage";
import { PopoverArrow } from "@radix-ui/react-popover";

function main() {
   const node = document.createElement('div');

   document.body.insertBefore(node, null);
   const root = createRoot(node);
   root.render(
      <RegisterHint></RegisterHint>
   )

}

main();

function RegisterHint() {
   const [loading, token] = useStorage('token');


   const [open, setOpen] = useState(false);

   useEffect(() => {
      const DELAY = 1000;

      if (!loading && !token) {
         setTimeout(() => {
            setOpen(true);
         }, DELAY)
      }
   }, [loading, token])

   useEffect(() => {

      const DELAY = 300;

      let canceled = false;
      const handler = () => {
         setTimeout(() => {
            if (!canceled) {
               setOpen(false);
            }
         }, DELAY)
      }

      addMessageListener('openPopup', handler);
      return () => {
         removeMessageListener('openPopup', handler);
         canceled = true;
      }
   }, [])

   return <>
      <Dialog open={open} >
         <DialogPortal>
            <DialogOverlay onClick={() => setOpen(false)} className=" bg-black/40" />
         </DialogPortal>
      </Dialog>
      <Popover open={open}>
         <PopoverAnchor asChild>
            <div className=" fixed w-1/3 top-0 right-0"></div>
         </PopoverAnchor>
         <PopoverContent className=" w-[350px]">
            <PopoverArrow className=" fill-white" />
            <Content />
         </PopoverContent>
      </Popover>
   </>
}


import tutorialPin from './assets/image/tutorial_pin_cropped.jpg'
import tutorialRegister from './assets/image/tutorial_register_cropped.jpg'
import { cn } from "./utils";
import { addMessageListener } from "./api";
import { removeMessageListener } from "./api/message";
function Content() {

   return <div className=" w-full">
      <p className=" ml-1">🤗完成註冊，馬上開始使用 {APP_TITLE}！</p>
      <div className=" relative [counter-reset:step]">
         <div className=" border-l ml-4 pl-6">
            <Step imgSrc={tutorialPin} title={`釘選${APP_TITLE}`} />
            <Step imgSrc={tutorialRegister} title={`開啟註冊頁面，點擊「上傳成績」`} />
         </div>
      </div>
   </div>
}

function Step(props: { imgSrc: string, title: string }) {
   const { imgSrc, title } = props;
   return < >
      <h4 className={cn("font-heading scroll-m-20 text-base font-semibold tracking-tight [counter-increment:step] mt-4 mb-3",
         " before:-ml-10  before:-mt-1 before:border-white before:border-4 before:[content:counter(step)] before:inline-flex before:justify-center before:items-center before: before:w-8 before:h-8 before:bg-[#eee] before:absolute before:rounded-full before:text-sm  "
      )}>
         {title}
      </h4>
      <img src={imgSrc} alt={title} />
   </>
}



