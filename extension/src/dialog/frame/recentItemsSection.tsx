import { History, getStorage, setStorage } from "../../api/storage";
import { ItemList, ItemProps } from './itemList';
import { ItemOnClickProps } from './dialog';
import { IconPlaylistX } from "@tabler/icons-react";
import { Button } from "./lib/button";


export function RecentItemsSection({
    histories,
    // items,
    itemOnClickFactory
}: {
    histories: History[],
    // items: ItemProps[],
    itemOnClickFactory: (props: ItemOnClickProps) => () => void,
}) {

    // todo: loading state

    const items: ItemProps[] = histories
        .sort((a, b) => b.timeStamp - a.timeStamp)
        .map<ItemProps>(({ classCount, course }) => {
            return {
                count: classCount, course, type: 'recent',
                onClick: itemOnClickFactory(
                    { classCount, course }
                ),
                remove() {
                    getStorage('histories').then(histories => {
                        histories = histories?.filter(
                            h => JSON.stringify(h.course) !== JSON.stringify(course)
                        );
                        setStorage({ histories });
                    })
                }
            };
        })

    // todo: maybe sneakly fetch real classCount    
    // const [items, setItems] = useState<ItemProps[]>([]);
    // useEffect(() => {
    //     if (!histories) {
    //         setItems([]);
    //         return;
    //     }
    //     // console.log('dispatch')

    //     let cancel = false;
    //     // const newItems: ItemProps[] = [];
    //     const courses: CourseReadWithGrade[] = [];
    //     // todo: currently all need to re-fetch when re-render. 
    //     Promise.all(histories.sort((a, b) => b.timeStamp - a.timeStamp).map(async history => {
    //         const { courseId1: id1 } = history;
    //         const [course, error] = await sendRuntimeMessage('service', { funcName: 'getCourseCourseId1Get', args: { id1 } });
    //         // console.log(course, error);
    //         if (course) {
    //             // newItems.push({
    //             //    type: 'recent',
    //             //    course,
    //             //    count: course.grades.length,
    //             //    onClick: itemOnClickFactory(course.id1),
    //             // });
    //             courses.push(course);
    //         }

    //         // ? not directly return because there may be fetching error
    //         // return course;
    //     })).then(() => {
    //         if (!cancel) {
    //             const newItems = getSortedCourses(courses, histories).map(course => (
    //                 {
    //                     type: 'recent' as const,
    //                     course,
    //                     count: new Set(course.grades.map(g => g.class_id)).size,
    //                     onClick: itemOnClickFactory(course.id1),
    //                 }
    //             ))
    //             setItems(newItems);
    //         } else
    //             console.log('canceled, not set');

    //     })

    //     return () => { console.log('cancel'); cancel = true };
    // }, [histories]);

    function clearAll() {
        setStorage({ 'histories': [] });
    }


    return <>
        <ItemList
            title={
                <div className=" flex  justify-between items-center">
                    最近搜尋
                    <button
                        onClick={clearAll}
                        className=" rounded flex justify-center items-center w-7  cursor-pointer  bg-transparent aspect-square  hover:bg-[#d9d9d9]/[.5]  border border-solid border-[#bbbbbb]/[.5] shadow-sm"><IconPlaylistX {...{
                            size: 16,
                            color: '#717171',
                            stroke: 1.5,
                        }} />
                    </button>
                    {/* <Button variant={'outline'} onClick={clearAll}>
                        <IconPlaylistX {...{
                            size: 20,
                            color: '#717171',
                            stroke: 1.5,
                        }} />
                    </Button> */}
                </div>
            }
            items={items}
        />
    </>
}
