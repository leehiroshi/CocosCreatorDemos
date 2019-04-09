import { ScrollItemTemplate, RecycleScrollView, ScrollDirection, ScrollItemData, ScrollItem } from "./RecycleScrollView"
import Item from "./Item";

const { ccclass, property } = cc._decorator;
@ccclass
export default class RecycleScrollViewCtrl extends cc.Component {

    @property(cc.Prefab)
    item: cc.Prefab = null;

    @property(cc.ScrollView)
    scrollview: cc.ScrollView = null;

    @property(cc.Node)
    mask: cc.Node = null;

    @property(cc.Node)
    content: cc.Node = null;

    // LIFE-CYCLE CALLBACKS:

    // onLoad () {}

    scview: RecycleScrollView;

    templates: ScrollItemTemplate[]

    start() {

        let itemInstance1 = cc.instantiate(this.item);
        let itemInstance2 = cc.instantiate(this.item);

        this.templates = [

            { key: "key1", node: itemInstance1 },
            { key: "key2", node: itemInstance2 },

        ];


        this.scview = new RecycleScrollView({
            scrollview: this.scrollview,
            mask: this.mask,
            content: this.content,
            itemTemplates: this.templates,
            cbHost: this,
            onItemSet: this.onItemSet,
            onRecycleItemCb: this.onItemRecycle,
            onVisibleItemsChanged: this.onVisibleItemsChanged,
            gapY: 10,
            autoScrolling: true,
            direction: ScrollDirection.Vertical,
        });



        let data: ScrollItemData[] = [{ key: "key1", data: "john" }, { key: "key2", data: "jack" }, { key: "key1", data: "david" }, { key: "key1", data: "lee" },
        { key: "key2", data: "stan" }, { key: "key2", data: "jane" }, { key: "key1", data: "elen" }, { key: "key1", data: "mark" }];
        this.scview.appendData(data[0], data[1], data[2], data[3], data[4], data[5], data[6], data[7]);

        this.scview.insertData(0, { key: "key1", data: "third" });

        this.scview.insertData(0, { key: "key2", data: "second" });

        this.scview.insertData(0, { key: "key1", data: "first" });

        this.scview.scrollToEnd();

    }

    onVisibleItemsChanged(allItems: ScrollItem[], start: number, stop: number) {

        console.log("on_visible_items_changed,start:" + start + ",stop:" + stop);


        for (let i = start; i <= stop; ++i) {
            let element = allItems[i];
            let itemScript;

            if (element.node) itemScript = element.node.getComponent(Item);
            else continue;

            if (!itemScript) continue;
            else console.log("itemScript is not null in i:" + i);

            itemScript.onClickCallback = (item: cc.Node, data: any) => {
                console.log("Helloworld itemOnClickCallback:" + item);
                let ss = element;
                //element.node=item;
                this.scview.removeData(element);

            };
        }

    }


    onItemSet(item: cc.Node, key: string, data: any, index: number): [number, number] {
        console.log("HelloWorld item_setter,index:" + index);
        this.scview;
        let itemScript;
        let sprite;
        switch (key) {
            case "key1":
                let ok = item.getComponentInChildren(cc.Label);
                ok.string = data.toString();

                item.height = 100;

                item.color = cc.color(0, 255, 0);

                return [400, 100];

            case "key2":
                let not_ok = item.getComponentInChildren(cc.Label);
                not_ok.string = data.toString();

                item.height = 40;

                sprite = item.getComponent(cc.Sprite);

                return [400, 40];
        }

    }

    onItemRecycle(item: cc.Node, key: string) {
        let not_ok = item.getComponentInChildren(cc.Label);
        console.log("list_item_recycle:string:" + not_ok.string);
    }

    // update (dt) {}
}
