const compileUtil = {
    updater: {
        textUpdater(node, value) {
            node.textContent = value;
        },
        htmlUpdater(node, value) {
            node.innerHTML = value;
        },
        modelUpdater(node, value) {
            node.value = value;
        },
    },
    getContentVal(expr, vm) {
        return expr.replace(/\{\{(.+?)\}\}/g, (e, exprVal) => this.getVal(exprVal, vm))
    },
    text(node, expr, vm) {
        let value = null;
        if (expr.includes('{{')) {
            //此时处理文本节点中的表达式{{}}全局匹配表达式{{}}----{{}}
            value = expr.replace(/\{\{(.+?)\}\}/g, (e, exprVal) => {
                new Watcher(vm, exprVal, () => this.updater.textUpdater(node, this.getContentVal(expr, vm)))
                return this.getVal(exprVal, vm);
            })

        } else {
            value = this.getVal(expr, vm);
            new Watcher(vm, expr, (newValue) => this.updater.textUpdater(node, newValue))
        }

        this.updater.textUpdater(node, value);
    },
    html(node, expr, vm) {
        //htmlStr
        const value = this.getVal(expr, vm);
        //视图更新时 为什么只执行了一次watcher中的updater
        //因为这个方法是在初始化时执行的，在初始化时为该属性绑定了一个更新函数，每次更新时，进入到watcher中，执行watcher中绑定的函数，而不是重新初始化
        this.updater.htmlUpdater(node, value);
        //创建watcher 绑定更新函数 在数据发生变化时更新视图 
        new Watcher(vm, expr, (newValue) => this.updater.htmlUpdater(node, newValue));

    },
    model(node, expr, vm) {
        const value = this.getVal(expr, vm);
        this.updater.modelUpdater(node, value);
        //初始化渲染数据完成
        //创建watcher
        new Watcher(vm, expr, (newValue) => this.updater.modelUpdater(node, newValue));
        //添加input事件 实现双向绑定
        node.addEventListener('input', e => {
            e = e || window.event;
            this.setVal(expr, vm, e.target.value)
        }, false)

    },
    on(node, fn, vm, eventName) {
        //根据函数名从数据中获得对应的函数体
        const cb = vm.$options.methods && vm.$options.methods[fn];
        node.addEventListener(eventName, cb.bind(vm), false)
    },
    bind(node, expr, vm, attr) {
        const value = this.getVal(expr, vm)
        node.setAttribute(attr, value)
    },
    getVal(expr, vm) {//msg person.name
        return expr.split('.').reduce((data, currentAttr) => data[currentAttr], vm.$data)
    },
    setVal(expr, vm, value) {
        expr.split('.').reduce((data, currentAttr, index, arr) => {
            if (index === arr.length - 1) {
                data[currentAttr] = value;
            }
            return data[currentAttr]
        }, vm.$data)
        console.log(this.getVal(expr, vm))
    }
}
class Compile {
    constructor(el, vm) {
        //判断el是否是元素节点
        this.el = this.isElNode(el) ? el : document.querySelector(el);
        this.vm = vm;
        //1.存入文档碎片
        const fragment = this.node2fragment(this.el);
        //2.在内存中编译
        this.compile(fragment)
        //3.插入dom的根元素中
        this.el.appendChild(fragment)
    }
    compile(fragment) {
        //1.对每个子节点进行编译
        const childNodes = fragment.childNodes;
        [...childNodes].forEach(childNode => {
            //判断子节点是元素节点还是文本节点
            this.isElNode(childNode) ? this.compileElement(childNode) : this.compileText(childNode);
            //如果子节点还有子节点 需要递归遍历
            if (childNode.childNodes && childNode.childNodes.length) this.compile(childNode);
        })
    }
    compileText(node) {
        const content = node.textContent;
        if (/\{\{(.+?)\}\}/.test(content)) {
            // console.log(content); {{person.name}}===={{person.age}}  {{person.fav}} {{msg}}
            compileUtil['text'](node, content, this.vm)
        }

    }
    //v-model='person.name' v-text='msg'
    compileElement(node) {
        const attributes = node.attributes;
        [...attributes].forEach(attr => {
            const { name, value } = attr;
            if (name.startsWith('v-')) {
                const [, directive] = name.split('v-');
                const [type, eventName] = directive.split(':');
                //向编译工具传入要编译的节点 表达式 vm取数据 事件/属性名
                compileUtil[type](node, value, this.vm, eventName);
                node.removeAttribute(name);

            } else if (name.startsWith('@')) {
                const [, eventName] = name.split('@');
                compileUtil['on'](node, value, this.vm, eventName);
                node.removeAttribute(name);
            } else if (name.startsWith(':')) {
                const [, attrName] = name.split(':');
                compileUtil['bind'](node, value, this.vm, attrName);
                node.removeAttribute(name)

            }
        })

    }
    isElNode(node) {
        return node.nodeType === 1;
    }
    node2fragment(node) {
        const fragment = document.createDocumentFragment();
        while (node.firstChild) {
            fragment.appendChild(node.firstChild);
        }
        return fragment;
    }
}

class MyVue {
    constructor(options) {
        this.$el = options.el;
        this.$data = options.data;
        this.$options = options;
        //如果el有值
        if (this.$el) {
            //1.实现一个数据观察者
            new Observer(this.$data);
            //2.实现一个指令解析器
            new Compile(this.$el, this);
            //3.实现proxy代理
            this.proxyData(this.$data)
        }


    }
    //代理数据
    proxyData(data) {
        Object.keys(data).forEach(key => {
            Object.defineProperty(this, key, {
                enumerable: true,
                get() {
                    return data[key];
                },
                set(value) {
                    data[key] = value;
                }

            })
        })
    }

}