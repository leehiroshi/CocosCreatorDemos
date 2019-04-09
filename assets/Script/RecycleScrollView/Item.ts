const { ccclass, property } = cc._decorator;

@ccclass
export default class Item extends cc.Component {

  onClickCallback: (item: cc.Node, data: any) => void;

    index: number = -1;

    // LIFE-CYCLE CALLBACKS:

    // onLoad () {}

    start() {

    }

    onClick() {
        console.log("Item onClick");
        if (this.onClickCallback) {
            this.onClickCallback(this.node, null);
        }

    }



    // update (dt) {}
}
