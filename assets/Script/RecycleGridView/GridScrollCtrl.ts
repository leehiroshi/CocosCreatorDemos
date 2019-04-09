import { ListView, ListViewDir } from "./RecycleGridView";

const { ccclass, property } = cc._decorator;

@ccclass
export default class GridScrollCtrl extends cc.Component {

    @property(cc.Prefab)
    item: cc.Prefab = null;

    @property(cc.ScrollView)
    scrollview: cc.ScrollView = null;

    @property(cc.Node)
    mask: cc.Node = null;

    @property(cc.Node)
    content: cc.Node = null;

    private list: ListView;
    private itemInstance: cc.Node;

    list_item_setter(item: cc.Node, data: any, index: number) {

      let itemLabel=  item.getComponent(cc.Label);
      itemLabel.string=""+data

    }

    list_item_onselect(data: any, index: number) {

    }

    list_item_onrecycle(item: cc.Node) {

    }



    start() {

        this.content.removeAllChildren();

        this.itemInstance = cc.instantiate(this.item);


        this.list = new ListView({
            scrollview: this.scrollview,
            mask: this.mask,
            content: this.content,
            item_tpl: this.itemInstance,
            cb_host: this,
            itemSetter: this.list_item_setter,
            selectCb: this.list_item_onselect,
            recycleCb: this.list_item_onrecycle,
            column: 4,
            gapY: 10,
            direction: ListViewDir.Vertical
        });

        let data: any[] = ["john", "jack", "david", "lee", "michael", "stan", "mark", "elen", "jackson", "mitsu", "bushi", "toyota", "yamaha", "mark", 
        "elen", "jackson", "mitsu", "bushi", "toyota", "yamaha", "mark", "elen", "jackson", "mitsu", "bushi", "toyota", "yamaha", "mark", "elen", "jackson", 
        "mitsu", "bushi", "toyota", "yamaha"];

        this.list.setData(data);

    }
}
