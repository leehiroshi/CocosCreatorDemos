
import { LayoutUtil } from "./LayoutUtils"

/**
 * ListView, 循环滚动列表，固定尺寸item, 屏幕可见范围外item会回收等待下次复用。支持横向，竖向，多行多列。
 */
export class ListView {
    private scrollview: cc.ScrollView;
    private mask: cc.Node;
    private content: cc.Node;
    /**
     * item templates
     */
    private itemTpl: cc.Node;
    private nodePool: cc.Node[];

    private dir: number;
    private width: number;
    private height: number;
    private gapX: number;
    private gapY: number;
    private row: number;
    private col: number;
    private itemWidth: number;
    private itemHeight: number;
    private cbHost: any;
    private itemSetter: (item: cc.Node, data: any, index: number) => void;
    private recycleCb: (item: cc.Node) => void;
    private selectCb: (data: any, index: number) => void;
    private selectSetter: (item: cc.Node, is_select: boolean, index: number) => void;
    private scrollToEndCb: () => void;
    private autoScrolling: boolean;
    private items: ListItem[];
    private startIndex: number;
    private stopIndex: number;
    private _datas: any[];
    private _selected_index: number = -1;

    constructor(params: ListViewParams) {
        this.scrollview = params.scrollview;
        this.mask = params.mask;
        this.content = params.content;
        this.itemTpl = params.item_tpl;
        this.itemTpl.active = false;
        this.itemWidth = this.itemTpl.width;
        this.itemHeight = this.itemTpl.height;
        this.dir = params.direction || ListViewDir.Vertical;
        this.width = params.width || this.mask.width;
        this.height = params.height || this.mask.height;
        this.gapX = params.gapX || 0;
        this.gapY = params.gapY || 0;
        this.row = params.row || 1;
        this.col = params.column || 1;
        this.cbHost = params.cb_host;
        this.itemSetter = params.itemSetter;
        this.recycleCb = params.recycleCb;
        this.selectCb = params.selectCb;
        this.selectSetter = params.selectSetter;
        this.scrollToEndCb = params.scrollToEndCb;
        this.autoScrolling = params.autoScrolling || false;
        this.nodePool = [];

        if (this.dir == ListViewDir.Vertical) {
            let real_width: number = (this.itemWidth + this.gapX) * this.col - this.gapX;
            if (real_width > this.width) {
                console.log("real width > width, resize scrollview to realwidth,", this.width, "->", real_width);
                this.width = real_width;
            }
            this.content.width = this.width;
        }
        else {
            let real_height: number = (this.itemHeight + this.gapY) * this.row - this.gapY;
            if (real_height > this.height) {
                console.log("real height > height, resize scrollview to realheight,", this.height, "->", real_height);
                this.height = real_height;
            }
            this.content.height = this.height;
        }
        this.mask.setContentSize(this.width, this.height);
        this.mask.addComponent(cc.Mask);
        this.scrollview.node.setContentSize(this.width, this.height);
        this.scrollview.vertical = this.dir == ListViewDir.Vertical;
        this.scrollview.horizontal = this.dir == ListViewDir.Horizontal;
        this.scrollview.inertia = true;
        this.scrollview.node.on("scrolling", this.onScrolling, this);
        this.scrollview.node.on("scroll-to-bottom", this.onScrollToEnd, this);
        this.scrollview.node.on("scroll-to-right", this.onScrollToEnd, this);
        // cc.info("constructor", this.mask.width, this.mask.height, this.scrollview.node.width, this.scrollview.node.height, this.content.width, this.content.height);
    }

    private onScrollToEnd() {
        if (this.scrollToEndCb) {
            this.scrollToEndCb.call(this.cbHost);
        }
    }

    private onScrolling() {
        if (!this.items || !this.items.length) {
            return;
        }
        if (this.dir == ListViewDir.Vertical) {
            let posy: number = this.content.y;
            // cc.info("onscrolling, content posy=", posy);
            if (posy < 0) {
                posy = 0;
            }
            if (posy > this.content.height - this.height) {
                posy = this.content.height - this.height;
            }
            let start: number = 0;
            let stop: number = this.items.length - 1;
            let viewport_start: number = -posy;
            let viewport_stop: number = viewport_start - this.height;
            while (this.items[start].y - this.itemHeight > viewport_start) {
                start++;
            }
            while (this.items[stop].y < viewport_stop) {
                stop--;
            }
            if (start != this.startIndex && stop != this.stopIndex) {
                this.startIndex = start;
                this.stopIndex = stop;
                // cc.info("render_from:", start, stop);
                this.renderItems();
            }
        }
        else {
            let posx: number = this.content.x;
            // cc.info("onscrolling, content posx=", posx);
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
            while (this.items[start].x + this.itemWidth < viewport_start) {
                start++;
            }
            while (this.items[stop].x > viewport_stop) {
                stop--;
            }
            if (start != this.startIndex && stop != this.stopIndex) {
                this.startIndex = start;
                this.stopIndex = stop;
                // cc.info("render_from:", start, stop);
                this.renderItems();
            }
        }
    }

    selectItem(index) {
        if (index == this._selected_index) {
            return;
        }
        if (this._selected_index != -1) {
            this.innerSelectItem(this._selected_index, false);
        }
        this.innerSelectItem(index, true);
    }

    private innerSelectItem(index: number, is_select: boolean) {
        let item: ListItem = this.items[index];
        if (!item) {
            cc.warn("inner_select_item index is out of range{", 0, this.items.length - 1, "}", index);
            return;
        }
        item.is_select = is_select;
        if (item.node && this.selectSetter) {
            this.selectSetter.call(this.cbHost, item.node, is_select, index);
        }
        if (is_select) {
            this._selected_index = index;
            if (this.selectCb) {
                this.selectCb.call(this.cbHost, item.data, index);
            }
        }
    }

    private spawnNode(index: number): cc.Node {
        let node: cc.Node = this.nodePool.pop();
        if (!node) {
            node = cc.instantiate(this.itemTpl);
            node.active = true;
            // cc.info("spawn_node", index);
        }
        node.parent = this.content;
        return node;
    }

    private recycleItem(item: ListItem) {
        if (item.node && cc.isValid(item.node)) {
            if (this.recycleCb) {
                this.recycleCb.call(this.cbHost, item.node);
            }
            item.node.removeFromParent();
            this.nodePool.push(item.node);
            item.node = null;
        }
    }

    private clearItems() {
        if (this.items) {
            this.items.forEach((item) => {
                this.recycleItem(item);
            });
        }
    }

    private renderItems() {
        let item: ListItem;
        for (let i: number = 0; i < this.startIndex; i++) {
            item = this.items[i];
            if (item.node) {
                // cc.info("recycle_item", i);
                this.recycleItem(item);
            }
        }
        for (let i: number = this.items.length - 1; i > this.stopIndex; i--) {
            item = this.items[i];
            if (item.node) {
                // cc.info("recycle_item", i);
                this.recycleItem(item);
            }
        }
        for (let i: number = this.startIndex; i <= this.stopIndex; i++) {
            item = this.items[i];
            if (!item.node) {
                // cc.info("render_item", i);
                item.node = this.spawnNode(i);
                this.itemSetter.call(this.cbHost, item.node, item.data, i);
                if (this.selectSetter) {
                    this.selectSetter.call(this.cbHost, item.node, item.is_select, i);
                }
            }
            item.node.setPosition(item.x, item.y);
        }
    }

    private packItem(data: any): ListItem {
        return { x: 0, y: 0, data: data, node: null, is_select: false };
    }

    private layoutItems(start: number) {
        // cc.info("layout_items, start=", start);
        for (let index: number = start, stop: number = this.items.length; index < stop; index++) {
            let item: ListItem = this.items[index];
            if (this.dir == ListViewDir.Vertical) {
                [item.x, item.y] = LayoutUtil.verticalLayout(index, this.itemWidth, this.itemHeight, this.col, this.gapX, this.gapY);
            }
            else {
                [item.x, item.y] = LayoutUtil.horizontalLayout(index, this.itemWidth, this.itemHeight, this.row, this.gapX, this.gapY);
            }
        }
    }

    private resizeContent() {
        if (this.items.length <= 0) {
            this.content.width = 0;
            this.content.height = 0;
            return;
        }
        let last_item: ListItem = this.items[this.items.length - 1];
        if (this.dir == ListViewDir.Vertical) {
            this.content.height = Math.max(this.height, this.itemHeight - last_item.y);
        }
        else {
            this.content.width = Math.max(this.width, last_item.x + this.itemWidth);
        }
        // cc.info("resize_content", this.mask.width, this.mask.height, this.scrollview.node.width, this.scrollview.node.height, this.content.width, this.content.height);
    }

    setData(datas: any[]) {
        this.clearItems();
        this.items = [];
        this._datas = datas;
        datas.forEach((data) => {
            let item: ListItem = this.packItem(data);
            this.items.push(item);
        });
        this.layoutItems(0);
        this.resizeContent();
        this.startIndex = -1;
        this.stopIndex = -1;
        if (this.dir == ListViewDir.Vertical) {
            this.content.y = 0;
        }
        else {
            this.content.x = 0;
        }
        if (this.items.length > 0) {
            this.onScrolling();
        }
    }

    insertData(index: number, ...datas: any[]) {
        if (datas.length == 0) {
            console.log("nothing to insert");
            return;
        }
        if (!this.items) {
            this.items = [];
        }
        if (!this._datas) {
            this._datas = [];
        }
        if (index < 0 || index > this.items.length) {
            cc.warn("invalid index", index);
            return;
        }
        let is_append: boolean = index == this.items.length;
        let items: ListItem[] = [];
        datas.forEach((data) => {
            let item: ListItem = this.packItem(data);
            items.push(item);
        });
        this._datas.splice(index, 0, ...datas);
        this.items.splice(index, 0, ...items);
        this.layoutItems(index);
        this.resizeContent();
        this.startIndex = -1;
        this.stopIndex = -1;

        if (this.autoScrolling && is_append) {
            this.scrollToEnd();
        }
        this.onScrolling();
    }

    removeData(index: number, count: number = 1) {
        if (!this.items) {
            console.log("call set_data before call this method");
            return;
        }
        if (index < 0 || index >= this.items.length) {
            cc.warn("invalid index", index);
            return;
        }
        if (count < 1) {
            console.log("nothing to remove");
            return;
        }
        let old_length: number = this.items.length;
        let del_items: ListItem[] = this.items.splice(index, count);
        this._datas.splice(index, count);
        //回收node
        del_items.forEach((item) => {
            this.recycleItem(item);
        });

        //重新排序index后面的
        if (index + count < old_length) {
            this.layoutItems(index);
        }
        this.resizeContent();
        if (this.items.length > 0) {
            this.startIndex = -1;
            this.stopIndex = -1;
            this.onScrolling();
        }
    }

    appendData(...datas: any[]) {
        if (!this.items) {
            this.items = [];
        }
        this.insertData(this.items.length, ...datas);
    }

    scrollTo(index: number) {
        if (this.dir == ListViewDir.Vertical) {
            const min_y = this.height - this.content.height;
            if (min_y >= 0) {
                console.log("no need to scroll");
                return;
            }
            let [_, y] = LayoutUtil.verticalLayout(index, this.itemWidth, this.itemHeight, this.col, this.gapX, this.gapY);
            if (y < min_y) {
                y = min_y;
                console.log("content reach bottom");
            }
            if (y > 0) {
                y = 0;
                console.log("content reach top");
            }
            this.scrollview.setContentPosition(cc.v2(this.content.position.y, -y));
            this.onScrolling();
        }
        else {
            const max_x = this.content.width - this.width;
            if (max_x <= 0) {
                console.log("no need to scroll");
                return;
            }
            let [x, _] = LayoutUtil.horizontalLayout(index, this.itemWidth, this.itemHeight, this.row, this.gapX, this.gapY);
            if (x > max_x) {
                x = max_x;
                console.log("content reach right");
            }
            if (x < 0) {
                x = 0;
                console.log("content reach left");
            }
            this.scrollview.setContentPosition(cc.v2(-x, this.content.position.y));
            this.onScrolling();
        }
    }

    scrollToEnd() {
        if (this.dir == ListViewDir.Vertical) {
            this.scrollview.scrollToBottom();
        }
        else {
            this.scrollview.scrollToRight();
        }
    }

    refreshItem(index: number, data: any) {
        if (!this.items) {
            console.log("call set_data before call this method");
            return;
        }
        if (index < 0 || index >= this.items.length) {
            cc.warn("invalid index", index);
            return;
        }
        let item: ListItem = this.items[index];
        item.data = data;
        this._datas[index] = data;
        if (item.node) {
            if (this.recycleCb) {
                this.recycleCb.call(this.cbHost, item.node);
            }
            this.itemSetter.call(this.cbHost, item.node, item.data, index);
        }
    }

    destroy() {
        this.clearItems();
        this.nodePool.forEach((node) => {
            node.destroy();
        });
        this.nodePool = null;
        this.items = null;
        this._datas = null;

        if (cc.isValid(this.scrollview.node)) {
            this.scrollview.node.off("scrolling", this.onScrolling, this);
            this.scrollview.node.off("scroll-to-bottom", this.onScrollToEnd, this);
            this.scrollview.node.off("scroll-to-right", this.onScrollToEnd, this);
        }
    }

    get datas(): any[] {
        return this._datas;
    }

    get selectedIndex(): number {
        return this._selected_index;
    }

    get selectdData(): any {
        let item: ListItem = this.items[this._selected_index];
        if (item) {
            return item.data;
        }
        return null;
    }
}

export enum ListViewDir {
    Vertical = 1,
    Horizontal = 2,
}

type ListViewParams = {
    scrollview: cc.ScrollView;
    mask: cc.Node;
    content: cc.Node;
    item_tpl: cc.Node;
    direction?: ListViewDir;
    width?: number;
    height?: number;
    gapX?: number;
    gapY?: number;
    /**
     * 水平方向排版时，垂直方向上的行数
     */
    row?: number;
    /**
     * 垂直方向排版时，水平方向上的列数
     */
    column?: number;
    /**
     * 回调函数host
     */
    cb_host?: any;
    /**
     * item更新setter
     */
    itemSetter: (item: cc.Node, data: any, index: number) => void;
    /**
     * 回收时的回调
     */
    recycleCb?: (item: cc.Node) => void;
    /**
     * item选中回调
     */
    selectCb?: (data: any, index: number) => void;
    /**
     * item选中效果setter
     */
    selectSetter?: (item: cc.Node, is_select: boolean, index: number) => void;
    /**
     * 滚动到尽头的回调
     */      
    scrollToEndCb?: () => void;
    /**
     * append时自动滚动到尽头
     */
    autoScrolling?: boolean;
}

type ListItem = {
    x: number;
    y: number;
    data: any;
    node: cc.Node;
    is_select: boolean;
}