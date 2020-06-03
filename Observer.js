class Watcher{
    //watcher是在页面初始化的时候创建的
    constructor(vm,expr,cb){
        this.vm=vm;
        this.expr=expr;
        this.cb=cb;
        //通过取值 触发属性的get方法 从而将w添加到dep中
        Dep.target=this;
        compileUtil.getVal(this.expr,this.vm);
        Dep.target=null;
    }
    update(){
        //取出新值，将新值通过回调函数返回
        const value=compileUtil.getVal(this.expr,this.vm);
        this.cb(value);
    }

}

class Dep{
    constructor(){
        //存放watchers
        this.subs=[];
    }
    addSub(w){
        //将watcher添加到subs中
        this.subs.push(w);
    }
    notify(){
        //当数据发生变化时，Observer通过此方法通知watcher进行更新
        this.subs.forEach(w=>w.update())
    }

}

class Observer{
    constructor(data){
        //观察数据
        this.observe(data);
    }
    observe(data){
        //对data的每一个属性进行数据劫持
        if(data&&typeof data==='object') Object.keys(data).forEach(key=>this.defineReactive(data,key,data[key]));
       
    }
    defineReactive(obj,key,value){
        //属性值仍是对象时，会继续遍历 不是对象时，没有操作
        this.observe(value);
        //每一个属性都有一个自己的依赖收集器
        const dep=new Dep();
        Object.defineProperty(obj,key,{
            enumerable:true,
            configurable:false,
            get(){
                //页面初始化时，将watcher添加到对应的依赖收集器中 页面中使用几次该属性 就会产生几个watcher
                Dep.target&&dep.addSub(Dep.target)
                return value
            },
            set:newVal=>{
                
                if(newVal!==value){
                    //改变属性值时，如果改变的值是对象，也要劫持观察 使用箭头函数才能找到正确的this
                    this.observe(newVal)
                    value=newVal;
                    
                    //数据发生变化 通知dep=》watcher更改数据
                    dep.notify();
                }
            }
        })

    }
}