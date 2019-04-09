//item及父节点锚点都为(0,1)
export class LayoutUtil
{
    static verticalLayout(index:number, itemWidth:number, itemHeight:number, column:number = 1, gapX:number = 0, gapY:number = 0):[number, number]
    {
        let x:number = (index % column) * (itemWidth + gapX);
        let y:number = -Math.floor(index / column) * (itemHeight + gapY);
        return [x, y];
    }

    static horizontalLayout(index:number, itemWidth:number, itemHeight:number, row:number = 1, gapX:number = 0, gapY:number = 0):[number, number]
    {
        let x:number = Math.floor(index / row) * (itemWidth + gapX);
        let y:number = -(index % row) * (itemHeight + gapY); 
        return [x, y];
    }
}