

const { ccclass, property } = cc._decorator;

@ccclass
export default class PromiseTest extends cc.Component {

    // LIFE-CYCLE CALLBACKS:

    // onLoad () {}

    start() {

        // // an async function to simulate loading an item from some server
        // function loadItem(id: number): Promise<{ id: number }> {
        //     return new Promise((resolve) => {
        //         console.log('loading item', id);
        //         setTimeout(() => { // simulate a server delay
        //             resolve({ id: id });
        //         }, 1000);
        //     });
        // }

        // // Chaining
        // let item1, item2;
        // loadItem(1)
        //     .then((res) => {
        //         item1 = res;
        //         return loadItem(2);
        //     })
        //     .then((res) => {
        //         item2 = res;
        //         console.log('done');
        //     }); // overall time will be around 2s

        // // Parallel
        // Promise.all([loadItem(1), loadItem(2)])
        //     .then((res) => {
        //         [item1, item2] = res;
        //         console.log('done');
        //     }); // overall time will be around 1s


        var task1 = new Promise(function (resolve, reject) {
            setTimeout(resolve, 1000, 'one');
            console.log("resolve one");
        });

        var task2 = new Promise(function (resolve, reject) {
            setTimeout(resolve, 2000, 'two');
            console.log("resolve two");
        });

        Promise.race([task1, task2]).then(function (value) {
            console.log(value); // "one"
            // Both resolve, but task1 resolves faster
        });

    }

    // update (dt) {}
}
