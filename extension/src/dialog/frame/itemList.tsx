

import { CourseBase } from "../../client";
import { IconBackspace, IconBook2, IconHistory, IconX, TablerIconsProps } from '@tabler/icons-react';
import { ReactNode } from "react";


export type ItemListProps = {
    title: ReactNode,
    items: ItemProps[],

    // todo: collapse
    // initialMaxItems: number;
};
export function ItemList(props: ItemListProps) {
    const { title, items } = props;

    return <div className="w-full">
        <div className="mx-2 mb-2">
            {typeof title === 'string'
                ? <h4
                    className="text-sm text-[#a6a6a6]  font-semibold"
                //onClick={() => { console.log('h4') }}
                >
                    {title}
                </h4>
                : <>
                    {title}
                </>
            }
        </div>
        {items.length ?
            <ul
                className=" flex flex-col items-stretch"
            >
                {
                    items.map((itemProp, i) => (
                        <Item {...itemProp} key={`item-${itemProp.course.id1}`} />
                    ))
                }
            </ul>
            :
            <div
                className="h-8 flex items-center justify-center text-sm text-[#717171]">
                尚無紀錄
            </div>
            // todo: icon
        }
    </div>
}

export type ItemProps = {
    type: 'normal' | 'recent';
    course: CourseBase;
    count: number;
    onClick: () => void;
    remove?: () => void;
}

// todo: action: pin, remove
export function Item(props: ItemProps) {
    const { type, course, count, onClick, remove } = props;

    // console.log(onClick);

    const iconProps: TablerIconsProps = {
        size: 16,
        color: '#717171',
        stroke: 1.5,
    };

    // todo: title truncate
    // todo: show lecturers
    // todo: add space between en & zh

    return <li
        className=' [&_[data-show=onhover]]:invisible  [&:hover_[data-show=onhover]]:visible hover:cursor-pointer justify-between rounded-md  flex flex-row p-2 m-0 hover:bg-[#dfdfdf] hover:bg-opacity-[.40] '
        onClick={onClick}
    >
        <div className="flex flex-row items-center p-0 m-0">
            <span className="p-0 m-0 mr-2">
                {type === 'normal'
                    ? <IconBook2 {...iconProps} />
                    : <IconHistory {...iconProps} />
                }
            </span>
            <span className="mr-1 align-middle text-[#717171] text-sm"> {course.title} </span>
            <span className="align-middle text-[#cccccc] text-xs">{course.id1}</span>
        </div>
        {type === 'normal'
            ? <div className=" text-[#717171] text-xs align-middle flex flex-row items-center">
                {count} 個班次
            </div>
            : <span className=" w-6 h-6 before:absolute before:content-[''] relative before:bg-transparent before:block before:rounded hover:cursor-pointer hover:before:bg-[#999999]/[.3]   before:w-6 before:h-6 flex justify-center items-center" data-show="onhover" onClick={(e) => {
                if (remove)
                    remove();
                e.stopPropagation()
            }}>
                <IconBackspace {...iconProps} />
            </span>
        }
    </li>
}

