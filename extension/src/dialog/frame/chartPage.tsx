


import { IconChartBar, IconChartPie, IconChevronLeft, IconChevronRight, IconInfoCircle, IconUser, TablerIconsProps } from "@tabler/icons-react";
import { CourseBase, CourseReadWithGrade, GradeWithSegments, Segment } from "../../client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { sendRuntimeMessage } from "../../api";
import { BarChart, IChartData, PIECHART_COLORS, PieChart } from "../../components/gradeChart";
import { GRADES, semesterCompareFn } from "../../utils";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "./lib/select";
import { CloseBtn } from "./dialog";
import clsx from "clsx";
import { ToggleGroup, ToggleGroupItem } from "./lib/toggleGroup";
import { Loading } from "./loading";
import { ErrorBoundary } from "react-error-boundary";
import { Error } from "./error";
import { ScrollArea } from "./lib/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./lib/tooltip";


export type ChartType = 'pie' | 'bar';


function LegendItem({ id, label, value, color, className, ...props }: IChartData & { color: string } & Omit<React.ComponentProps<'div'>, 'id'>) {

   return <div
      className={clsx("flex flex-row items-center", className)}
      {...props}
   >
      <div className={`rounded-full w-3 h-3 mr-2`} style={{ backgroundColor: color }}></div>
      <div className="text-sm  text-[#3f3f3f]" >{label}</div>
   </div>
}

function ChartWrapper(props: { type: ChartType, segments: Segment[] }) {

   const { type, segments } = props;

   const getLabel = (seg: Segment) => seg.l === seg.r ? `${GRADES[seg.l]}` : `${GRADES[seg.r]} –  ${GRADES[seg.l]}`;

   const datas: IChartData[] = useMemo(() => {
      return segments.map<IChartData>(seg => {
         return { label: getLabel(seg), value: parseFloat(seg.value) };
      }).reverse();
   }, [segments]);


   const chartMap: Record<ChartType, ReactNode> = {
      'pie': <PieChart
         slotProps={{ legend: { hidden: true } }}
         datas={datas}
         width={180}
         height={180}
         margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
      />,
      'bar': <BarChart
         datas={datas}
         width={340}
         height={180}
      />
   };

   const gap = 4;
   const height = 20;
   const totalHeight = datas.length * (gap + height) - gap;

   return <div className={clsx(` flex items-center flex-1 w-full p-2 px-8 gap-8`,
      type === 'pie' ? 'justify-between' : ' justify-center'
   )}>
      <div className="flex items-center w-2/3">
         {chartMap[type]}
      </div>
      {type === 'pie' &&
         // <div className="flex flex-col items-stretch justify-center flex-1 px-8">
         <div className="flex-1 h-full ">
            <div className="relative flex-1 w-32 h-full">
               {/* <div className="flex flex-col items-start justify-center gap-1">
               {datas.map((data, i) => <LegendItem key={`label-${i}`} {...data} color={PIECHART_COLORS[i]} />)}
            </div> */}

               {/* <div className="relative" style={{ height: `${datas.length * (gap + height) - gap}px` }}> */}
               {datas.map((data, i) => <LegendItem
                  key={`label-${data.label}`}
                  {...data}
                  color={PIECHART_COLORS[i]}
                  className="absolute w-full transition-transform duration-300 top-1/2 animate-in fade-in-0"
                  style={{
                     transitionDuration: '300ms',
                     transform: `translateY(${-totalHeight / 2 + i * (gap + height)}px)`
                  }}
               />)}
               {/* </div> */}
            </div>
         </div>
      }
   </div>
}


function getSortedSemesters(grades: GradeWithSegments[]): string[] {
   return grades.map(g => g.semester).sort(semesterCompareFn);
}

// todo: maybe merge same lecturer but different class_id
type ClassKey = {
   lecturer: string;
   classId: string;
}


export type ChartPageProps = {
   // grades: GradeElement[];
   courseId1: CourseBase['id1'];
   title: string;
   defaultClassKey: ClassKey | null;  // todo: save in storage
   defaultChartType: ChartType;
   // todo: store semester 

   goBack: () => void;
   close: () => void;
}

export function ChartPage(props: ChartPageProps) {
   const { courseId1, title, goBack, close } = props;

   const [error, setError] = useState(false);
   const [course, setCourse] = useState<CourseReadWithGrade | null>(null);

   // todo: maybe passing previous fetched title, so only body part will be loading 
   useEffect(() => {
      let canceled = false;
      sendRuntimeMessage('service', { funcName: 'getCourseCourseId1Get', args: { 'id1': courseId1 } }).then(([course, error]) => {
         if (canceled)
            return;
         if (error) {
            setError(true);
            return;
         }

         setCourse(course);

      })
      return () => {
         canceled = true;
      }
   }, [courseId1]);

   if (error)
      return <Error />


   // todo: (opt.) handle too long title 

   return <div className="flex flex-col h-full pr-4" >
      <header className="flex flex-row items-center w-full gap-2 mb-6" >
         <IconChevronLeft size={24} stroke={1.8} color="#4e4e4e"
            onClick={goBack}
            className="hover:cursor-pointer"
         />
         <div className="flex flex-row items-center gap-2">
            <h3 className="text-[#4e4e4e]  flex-wrap font-semibold text-xl">{title}</h3>
            <div className="text-[#909090]/[.82] text-sm">{courseId1}</div>
         </div>
         {/* <CloseBtn onClick={close} className="ml-auto" /> */}
      </header>
      <ErrorBoundary fallback={<Error />}>
         {course
            ? <InnerChartPage
               {...props}
               course={course}
            />
            : <Loading />
         }
      </ErrorBoundary>
   </div >
}

export function InnerChartPage(props: Pick<ChartPageProps, 'defaultChartType' | "defaultClassKey"> & { course: CourseReadWithGrade }) {


   const [classIdx, setClassIdx] = useState<number>(-1);
   const [semesterIdx, setSemesterIdx] = useState(-1);
   const [chartType, setChartType] = useState<ChartType>('pie');

   const { defaultChartType, defaultClassKey, course } = props;
   const { grades, id1, id2, title } = course;

   const classes: ClassKey[] = grades.map(g => ({ classId: g.class_id, lecturer: g.lecturer }))
      .reduce<ClassKey[]>((prev, cur) => {
         return prev.find(cls => cls.classId === cur.classId && cls.lecturer === cur.lecturer)
            ? prev : [...prev, cur];
      }, []).sort((clsA, clsB) => clsA.classId === clsB.classId
         ? clsA.lecturer.localeCompare(clsB.lecturer)
         : clsA.classId.localeCompare(clsB.classId)
      );

   const getGradesFiltered = (classKey: ClassKey) =>
      grades.filter(g =>
         g.class_id === classKey.classId && g.lecturer === classKey.lecturer
      );

   function init() {
      const classIdx = classes.findIndex(c =>
         c.classId === defaultClassKey?.classId && c.lecturer === defaultClassKey.lecturer);

      updateClassIdx(classIdx === -1 ? 0 : classIdx);
      setChartType(defaultChartType);
   }
   if (classIdx === -1) {
      init();
      return <>
         <Loading />
      </>
   }

   function updateClassIdx(classIdx: number) {
      setClassIdx(classIdx);

      const gradesFiltered = getGradesFiltered(classes[classIdx]);
      // console.log("update: ", gradesFiltered, semester, semesters[0]);
      // todo: if same semester exist, do not change
      setSemesterIdx(0);  // todo: default semester?
   }

   const classKey = classes[classIdx];
   const gradesFiltered = getGradesFiltered(classKey);
   const semesters = getSortedSemesters(gradesFiltered);
   const semester = semesters[semesterIdx];
   const activeGrade = gradesFiltered.find(g => g.semester === semester);


   if (!gradesFiltered || !semesters)
      throw 'gg'
   if (!semester)
      throw 'gg'
   if (!activeGrade)
      throw 'gg'

   function onChartTypeChange(type: string) {
      const chartTypes: Record<ChartType, 0> = {
         'bar': 0,
         'pie': 0,
      }
      if (!(type in chartTypes)) {
         //console.error(`unexpected chart type ${type}`)
         return;
      }

      setChartType(type as ChartType);
   }

   return <main className="flex flex-col h-full px-2 ">
      <div className=" [&_button]:ml-0  pb-3 border-0  border-solid border-b-[#e8e8e8] border-b flex flex-row items-center justify-between">
         <Select
            // defaultValue={`${classIdx}`}
            onValueChange={(val) => {
               updateClassIdx(parseInt(val));
            }}
            value={`${classIdx}`}
         >
            <SelectTrigger className="p-2 w-fit ">
               <IconUser stroke={1} color="#909090" size={16} className="mr-1" />
               <SelectValue >
                  <div>{classKey.lecturer}&nbsp;{classKey.classId} </div>
               </SelectValue>
            </SelectTrigger>
            <SelectContent className="overflow-y-auto max-h-80 ">
               <ScrollArea>
                  <SelectGroup>
                     {classes.map((cls, i) => {
                        return <SelectItem key={`class-${i}`} value={`${i}`}>
                           {`${cls.lecturer} ${cls.classId}`}
                        </SelectItem>
                     })}
                  </SelectGroup>
               </ScrollArea>
            </SelectContent>
         </Select>
         <div>
            <ChartTypeToggle
               chartType={chartType}
               onChartTypeChange={onChartTypeChange}
            />
         </div>
      </div>
      <div className="flex flex-col items-center justify-between flex-1 pb-8">
         <ChartWrapper
            type={chartType}
            segments={activeGrade.segments}
         />

         <div className="flex flex-row items-center min-w-64 px-3 w-full  justify-center gap-[30%]"
         // todo: indicator
         >
            <Btn
               onClick={() => setSemesterIdx(s => s - 1)}
               disabled={semesterIdx === 0}
               dir="left"
            />
            <div className=" text-[#515352] text-lg font-semibold relative flex  items-center">
               <div className="align-middle ">
                  {semester}
               </div>
               {!activeGrade.solid && <div className="flex items-center justify-center ml-1   -translate-y-[1px] ">
                  <TooltipProvider>
                     <Tooltip delayDuration={150}>
                        <TooltipTrigger>
                           <IconInfoCircle size={20} stroke={1.5} color="#909090" />
                        </TooltipTrigger>
                        <TooltipContent className=" bg-[#777777]">
                           此成績資料未經驗證
                        </TooltipContent>
                     </Tooltip>
                  </TooltipProvider>
               </div>}
            </div>
            <Btn
               onClick={() => setSemesterIdx(s => s + 1)}
               disabled={semesterIdx === semesters.length - 1}
               dir="right"
            />
         </div>
      </div>
   </main>
}

function ChartTypeToggle({ onChartTypeChange, chartType }: { onChartTypeChange: (val: string) => void, chartType: ChartType }) {

   const iconProps: TablerIconsProps = {
      color: '#747474',
      stroke: 1,
      size: 20,
   }

   return <ToggleGroup
      type="single" onValueChange={onChartTypeChange} value={chartType}
      className=" ntu-grade-viewer--reset divide-x rounded divide-solid divide-[#e8e8e8] gap-0  overflow-hidden border border-solid border-[#e5e5e5]"
   >
      <ToggleGroupItem value="pie" className="px-0 ">
         <IconChartPie {...iconProps} />
      </ToggleGroupItem>
      <ToggleGroupItem value="bar">
         <IconChartBar {...iconProps} />
      </ToggleGroupItem>
   </ToggleGroup>
}

function Btn({ dir, ...props }: React.ComponentProps<'button'>
   & { dir: 'left' | 'right' }) {

   const { disabled } = props;

   const iconProps: TablerIconsProps = {
      size: 18,
      stroke: 1.5,
      color: '#8e8e8e',
   }

   return <button
      className={clsx(
         " shadow-sm border-solid border-[1.5px] border-[#bbbbbb] w-6 h-6 flex items-center justify-center rounded",
         !disabled ? " hover:bg-[#e5e5e5]" : 'opacity-60  cursor-not-allowed',
      )}
      {...props}>

      {dir === 'left'
         ? <IconChevronLeft {...iconProps} />
         : <IconChevronRight {...iconProps} />
      }

   </button>
}