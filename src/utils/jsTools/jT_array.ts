import * as _o from "./jT_object";

/** Filter out items that are not unique within an array.
 * @param arr The array of items to filter.
 * @param prop The nested property within each item to filter by.
 * @param copy Return a deep copy of the array using structuredClone(). */
export function unique(arr: any[], prop: string = "", copy: boolean = false) {
    let arr_new = [];
    let map = new Map();

    for (let item of arr) {
        let _prop = typeof item === "object" ? _o.getProp(item, prop) : item;

        if (!map.has(_prop)) {
            map.set(_prop, true);
            arr_new.push(item);
        }
    }

    return copy ? structuredClone(arr_new) : arr_new;
}
