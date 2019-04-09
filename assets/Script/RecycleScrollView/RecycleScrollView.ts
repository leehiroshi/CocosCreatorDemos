/**
 * 循环滚动列表，支持不定尺寸的item, 屏幕可见范围外item会回收等待下次复用。支持横向，竖向, 但不支持多行多列。
 * ScrollView,mask,content,item 锚点必须是（0，1）
 */
export class RecycleScrollView {
    private scrollview: cc.ScrollView;
    private mask: cc.Node;
    private content: cc.Node;
    private itemTemplates: Map<string, cc.Node>;
    private nodePools: Map<string, cc.Node[]>;

    private dir: number;
    private width: number;
    private height: number;
    private gapX: number;
    private gapY: number;
    private cbHost: any;
    private onItemSet: (item: cc.Node, key: string, data: any, index: number) => [number, number];
    private onVisibleItemsChanged: (allItems: ScrollItem[], start: number, stop: number) => void;
    private onRecycleCb: (item: cc.Node, key: string) => void;
    private onScrollToEndCb: () => void;
    private autoScrolling: boolean;
    private items: ScrollItem[];
    private startIndex: number;
    private stopIndex: number;
    private preloadAmout: number = 0;
    private preloadTemplatesKey: string;

    private tag: string = "RecycleScrollView";

    constructor(params: ScrollViewParams) {
        this.scrollview = params.scrollview;
        this.mask = params.mask;
        this.content = params.content;
        this.nodePools = new Map();
        this.itemTemplates = new Map();
        params.itemTemplates.forEach((tpl) => {
            tpl.node.active = false;
            this.itemTemplates.set(tpl.key, tpl.node);
        });

        this.dir = params.direction || ScrollDirection.Vertical;
        this.width = params.width || this.mask.width;
        this.height = params.height || this.mask.height;
        this.gapX = params.gapX || 0;
        this.gapY = params.gapY || 0;
        this.cbHost = params.cbHost;
        this.onItemSet = params.onItemSet;
        this.onVisibleItemsChanged = params.onVisibleItemsChanged;
        this.onRecycleCb = params.onRecycleItemCb;
        this.onScrollToEndCb = params.onScrollToEndCb;
        this.autoScrolling = params.autoScrolling || false;
        this.preloadAmout = params.preloadAmout;
        this.preloadTemplatesKey = params.preloadTemplatesKey;

        if (this.dir == ScrollDirection.Vertical) {
            this.content.width = this.width;
        }
        else {
            this.content.height = this.height;
        }
        this.mask.setContentSize(this.width, this.height);
        this.mask.addComponent(cc.Mask);
        this.scrollview.node.setContentSize(this.width, this.height);
        this.scrollview.vertical = this.dir == ScrollDirection.Vertical;
        this.scrollview.horizontal = this.dir == ScrollDirection.Horizontal;
        this.scrollview.inertia = true;
        this.scrollview.node.on("scrolling", this.onScrolling, this);
        this.scrollview.node.on("scroll-to-bottom", this.onScrollToEnd, this);
        this.scrollview.node.on("scroll-to-right", this.onScrollToEnd, this);

        console.log(this.tag + ",constructor", this.mask.width, this.mask.height, this.scrollview.node.width, this.scrollview.node.height, this.content.width, this.content.height);

        this.insertPreloadItems(this.preloadAmout);

    }

    private onScrollToEnd() {
        if (this.onScrollToEndCb) {
            this.onScrollToEndCb.call(this.cbHost);
        }
    }

    private onScrolling() {
        if (!this.items || !this.items.length) {
            return;
        }
        if (this.dir == ScrollDirection.Vertical) {
            let posy: number = this.content.y;
            //k.log.info(this.tag + ",onscrolling, content posy=", posy);
            if (posy < 0) {
                posy = 0;
            }
            if (posy > this.content.height - this.height) {
                posy = this.content.height - this.height;
            }
            let start: number = 0;
            let index: number = 0;
            let stop: number = this.items.length - 1;
            let viewportStart: number = -posy;
            let viewportStop: number = viewportStart - this.height;
           // k.log.info(this.tag+",RecycleScrollView,viewport_start:" + viewportStart + ",viewport_stop:" + viewportStop);
            //test purpose
           // while (index < this.items.length) {
           //     k.log.info(this.tag + ",RecycleScrollView,index:" + index + ",index y :" + this.items[index].y + ",height:" + this.items[index].height);
          //      index++;
          //  }

            while (this.items[start].y - this.items[start].height > viewportStart) {
                //   k.log.info(this.tag+",RecycleScrollView,start:" + start + ",start y :" + this.items[start].y + ",height:" + this.items[start].height);
                start++;
            }

            while (this.items[stop].y < viewportStop) {
                //k.log.info(this.tag+",RecycleScrollView,stop:" + stop + ",stop y :" + this.items[stop].y);
                stop--;
            }

            console.log(this.tag + ",RecycleScrollView,visible start:" + start + ",visible stop:" + stop);

            if (start != this.startIndex || stop != this.stopIndex) {
                this.startIndex = start;
                this.stopIndex = stop;
                console.log(this.tag + ",render_from start:" + start + ",stop:" + stop);
                this.renderItems();

                this.onVisibleItemsChanged.call(this.cbHost, this.items, this.startIndex, this.stopIndex);

            }
        }
        else {
            let posx: number = this.content.x;
            //k.log.info(this.tag+",onscrolling, content posx=", posx);
            if (posx > 0) {
                posx = 0;
            }
            if (posx < this.width - this.content.width) {
                posx = this.width - this.content.width;
            }
            let start: number = 0;
            let stop: number = this.items.length - 1;
            let viewport_start: number = -posx;
            let viewport_stop: number = viewport_start + this.width;

            while (this.items[start].x + this.items[start].width < viewport_start) {
                start++;
            }
            while (this.items[stop].x > viewport_stop) {
                stop--;
            }
            if (start != this.startIndex || stop != this.stopIndex) {
                this.startIndex = start;
                this.stopIndex = stop;

                console.log(this.tag + ",render_from:", start, stop);
                this.renderItems();

                this.onVisibleItemsChanged.call(this.cbHost, this.items, this.startIndex, this.stopIndex);
            }
        }
    }
    /**
     * search value index less than find
     * @param find 
     * @param arr 
     */
    private binarySerach(find: any, arr: ScrollItem[]) {
        let index = 0;
        let low = 0;
        let high = arr.length - 1;
        let mid = 0;
        while (low <= high) {
            if (arr[low].y == find) {
                index = low;
                break;
            }
            if (arr[high].y == find) {
                index = high;
                break;
            }
            mid = Math.floor(low + ((high - low) / 2));
            if (arr[mid].y == find) {
                index = mid;
                break;
            }

            if (arr[mid].y < find) {
                low = mid + 1;
            }
            else {
                high = mid - 1;
            }
        }

        if (low > high) {
            return high;
        }
        else
            return index;
    }

    /**
     * spawn 与 despawn 节点
     */
    private renderItems() {
        let item: ScrollItem;
        for (let i: number = 0; i < this.startIndex; i++) {
            item = this.items[i];
            if (item.node) {
                // console.log("recycle_item", i);
                this.recycleItem(item);
            }
        }
        for (let i: number = this.items.length - 1; i > this.stopIndex; i--) {
            item = this.items[i];
            if (item.node) {
                // console.log("recycle_item", i);
                this.recycleItem(item);
            }
        }
        for (let i: number = this.startIndex; i <= this.stopIndex; i++) {
            item = this.items[i];
            if (!item.node) {
                // console.log("render_item", i);
                item.node = this.spawnNode(item.data.key);
                this.onItemSet.call(this.cbHost, item.node, item.data.key, item.data.data, i);
            }
            item.node.setPosition(item.x, item.y);
        }
    }

    /**
     * 从对象池取或者初始化一个条目
     * @param key 
     */
    private spawnNode(key: string): cc.Node {
        let node: cc.Node;
        let pools: cc.Node[] = this.nodePools.get(key);
        if (pools && pools.length > 0) {
            node = pools.pop();
        }
        else {
            node = cc.instantiate(this.itemTemplates.get(key));
            node.active = true;
            // console.log("spawn_node, key=", key);
        }
        node.parent = this.content;
        return node;
    }

    /**
     * 将一个条目回收
     * @param item 
     */
    private recycleItem(item: ScrollItem) {
        if (item.node && cc.isValid(item.node)) {
            let pools: cc.Node[] = this.nodePools.get(item.data.key);
            if (!pools) {
                pools = [];
                this.nodePools.set(item.data.key, pools);
            }
            pools.push(item.node);
            if (this.onRecycleCb) {
                this.onRecycleCb.call(this.cbHost, item.node, item.data.key);
            }
            item.node.removeFromParent();
            item.node = null;
        }
    }

    /**
     * 清空并回收所有节点
     */
    private clearItems() {
        if (this.items) {
            this.items.forEach((item) => {
                this.recycleItem(item);
            });
        }
    }

    /**
     * 将数据关联到 node
     * @param index
     * @param data 
     */
    private packItem(index: number, data: ScrollItemData): ScrollItem {
        let node: cc.Node = this.spawnNode(data.key);
        let [width, height]: [number, number] = this.onItemSet.call(this.cbHost, node, data.key, data.data, index);
        let item: ScrollItem = { x: 0, y: 0, width: width, height: height, data: data, node: node };
        //this.recycle_item(item);
        return item;
    }

    /**
     * 计算所有条目在容器中的位置
     * @param start 
     */
    private layoutItems(start: number) {
        // cc.info("layout_items, start=", start);
        if (this.items.length <= 0) {
            return;
        }
        let start_pos: number = 0;
        if (start > 0) {
            let prevItem: ScrollItem = this.items[start - 1];
            if (this.dir == ScrollDirection.Vertical) {
                start_pos = prevItem.y - prevItem.height - this.gapY;
            }
            else {
                start_pos = prevItem.x + prevItem.width + this.gapX;
            }
        }
        for (let index: number = start, stop: number = this.items.length; index < stop; index++) {
            let item: ScrollItem = this.items[index];
            if (this.dir == ScrollDirection.Vertical) {
                item.x = 0;
                item.y = start_pos;
                start_pos -= item.height + this.gapY;
            }
            else {
                item.y = 0;
                item.x = start_pos;
                start_pos += item.width + this.gapX;
            }
        }
    }

    /**
     * 计算 content size
     */
    private resizeContent() {
        if (this.items.length <= 0) {
            this.content.width = 0;
            this.content.height = 0;
            return;
        }
        let lastItem: ScrollItem = this.items[this.items.length - 1];
        if (this.dir == ScrollDirection.Vertical) {
            this.content.height = Math.max(this.height, lastItem.height - lastItem.y);
        }
        else {
            this.content.width = Math.max(this.width, lastItem.x + lastItem.width);
        }
        console.log(this.tag + ",resize_content,mask_width:" + this.mask.width + ",mask_height:" + this.mask.height +
            ",content_width:" + this.content.width + ",content_height:" + this.content.height);
    }

    /**
     * 初始化时插入预加载条目,也就是插入假数据
     * @param amout 
     */
    private insertPreloadItems(amout: number) {
        if (amout <= 0) return;
        if (!this.preloadTemplatesKey) return;

        let key = this.preloadTemplatesKey;

        let preloadItems: ScrollItemData[] = new Array();

        for (let i = 0; i < amout; ++i) {

            preloadItems.push({ key: key, data: FAKE_DATA.FAKE_DATA });
        }

        this.setData(preloadItems);

    }


    /**
     * 滚动到指定索引
     * @param index  索引
     */
    scrollToIndex(index: number) {
        let length = this.items.length;
        if (index < 0 || index >= length) {
            return;
        }

        this.layoutItems(0);
        this.resizeContent();

        if (this.dir == ScrollDirection.Vertical) {
            let y = this.items[index].y;
            let maxY = this.items[length - 1].y;
            let percent: number = y / maxY;
            this.scrollToPercent(1 - percent);

        } else {
            let x = this.items[index].x;
            let maxX = this.items[length - 1].x;
            let percent: number = x / maxX;
            this.scrollToPercent(1 - percent);
        }

    }

    /**
     * 滚动到百分比
     * @param percent 
     */
    scrollToPercent(percent: number) {

        //必须scheduleOnce，否则初始化时会随机出现不显示条目的 bug
        if (this.dir == ScrollDirection.Vertical) {
            this.scrollview.scheduleOnce(() => {
                this.scrollview.scrollTo(cc.v2(0, percent), 0.1);
            });
        } else {
            this.scrollview.scheduleOnce(() => {
                this.scrollview.scrollTo(cc.v2(percent, 0), 0.1);
            });
        }

        this.onScrolling();

    }

    /**
     * 滚动到底部
     */
    scrollToEnd() {

        this.layoutItems(0);
        this.resizeContent();

        //必须scheduleOnce，否则初始化时会随机出现不显示条目的 bug
        if (this.dir == ScrollDirection.Vertical) {
            this.scrollview.scheduleOnce(() => {
                this.scrollview.scrollToBottom(0.1);
            });

        }
        else {
            this.scrollview.scheduleOnce(() => {
                this.scrollview.scrollToBottom(0.1);
            });
        }

        this.onScrolling();
    }

    /**
     * 更新某一个条目的数据
     * @param index 
     * @param data 
     */
    updateData(index: number, data: ScrollItemData) {
        if (index < 0 || index >= this.items.length) return;
        let deleted: ScrollItem[] = this.items.splice(index, 1, this.packItem(index, data));
        this.recycleItem(deleted[0]);

        this.layoutItems(index);
        this.resizeContent();
        this.startIndex = -1;
        this.stopIndex = -1;

        this.onScrolling();
    }

    /**
     * 删除一个条目
     * @param scrollItem 
     */
    removeData(scrollItem: ScrollItem) {
        const index = this.items.indexOf(scrollItem, 0);
        if (index > -1) {
            this.items.splice(index, 1);
        } else {
            return;
        }
        this.layoutItems(index);
        this.recycleItem(scrollItem);
        this.resizeContent();
        this.startIndex = -1;
        this.stopIndex = -1;
        this.onScrolling();
    }

    /**
     * 设置所有条目数据
     * @param datas 
     */
    setData(datas: ScrollItemData[]) {
        this.clearItems();
        this.items = [];
        datas.forEach((data, index) => {
            let item: ScrollItem = this.packItem(index, data);
            this.items.push(item);
        });
        this.layoutItems(0);
        this.resizeContent();
        this.startIndex = -1;
        this.stopIndex = -1;
        if (this.dir == ScrollDirection.Vertical) {
            this.content.y = 0;
        }
        else {
            this.content.x = 0;
        }
        if (this.items.length > 0) {
            this.onScrolling();
        }
    }

    /**
     * 插入数据
     * @param index 插入位置
     * @param datas 
     */
    insertData(index: number, ...datas: ScrollItemData[]) {
        if (datas.length == 0) {
            // console.log("nothing to insert");
            return;
        }
        if (!this.items) {
            this.items = [];
        }
        if (index < 0 || index > this.items.length) {
            //cc.warn("invalid index", index);
            return;
        }
        let isAppend: boolean = index == this.items.length;
        let items: ScrollItem[] = [];
        datas.forEach((data, index) => {
            let item: ScrollItem = this.packItem(index, data);
            items.push(item);
        });
        this.items.splice(index, 0, ...items);
        this.layoutItems(index);
        this.resizeContent();
        this.startIndex = -1;
        this.stopIndex = -1;

        if (this.autoScrolling && isAppend) {
            this.scrollToEnd();
        }
        this.onScrolling();
    }

    /**
     * 在条目最后添加数据
     * @param datas 
     */
    appendData(...datas: ScrollItemData[]) {
        if (!this.items) {
            this.items = [];
        }
        this.insertData(this.items.length, ...datas);
    }

    destroy() {
        this.clearItems();
        this.nodePools.forEach((pools, key) => {
            pools.forEach((node) => {
                node.destroy();
            });
        });
        this.nodePools = null;
        this.items = null;

        if (cc.isValid(this.scrollview.node)) {
            this.scrollview.node.off("scrolling", this.onScrolling, this);
            this.scrollview.node.off("scroll-to-bottom", this.onScrollToEnd, this);
            this.scrollview.node.off("scroll-to-right", this.onScrollToEnd, this);
        }
    }
}

export type ScrollItemTemplate = {
    key: string;
    node: cc.Node;
}

export type ScrollItemData = {
    key: string;
    data: any;
}

export enum ScrollDirection {
    Vertical = 1,
    Horizontal = 2,
}

type ScrollViewParams = {
    scrollview: cc.ScrollView;
    mask: cc.Node;
    content: cc.Node;
    itemTemplates: ScrollItemTemplate[];
    direction?: ScrollDirection;
    width?: number;
    height?: number;
    gapX?: number;
    gapY?: number;
    /**
     * 回调函数host
     */
    cbHost?: any;
    /**
     * item 更新 setter
     */
    onItemSet: (item: cc.Node, key: string, data: any, index: number) => [number, number];
    /**
     * 可见条目索引发生变化
     */
    onVisibleItemsChanged?: (allItems: ScrollItem[], start: number, stop: number) => void;
    /**
     * 回收时的回调
     */
    onRecycleItemCb?: (item: cc.Node, key: string) => void;
    /**
     *滚动到尽头的回调
     */
    onScrollToEndCb?: () => void;
    /**
     * append 时自动滚动到尽头
     */
    autoScrolling?: boolean;
    /**
     * 没有数据时，预加载的 item 个数
     */
    preloadAmout?: number;
    /**
     * 没有数据时，预加载模板的key
     */
    preloadTemplatesKey?: string;
}

export type ScrollItem = {
    x: number;
    y: number;
    width: number;
    height: number;
    data: ScrollItemData;
    node: cc.Node;
}

/**
 * 假数据
 */
export enum FAKE_DATA {
    FAKE_DATA,
}


