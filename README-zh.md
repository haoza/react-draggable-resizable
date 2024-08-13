<p align="center"><img src="https://rawgit.com/mauricius/react-draggable-resizable/v1/docs/resources/logo.png" alt="logo"></p>
<h1 align="center">ReactDraggableResizable</h1>

[![Latest Version on NPM](https://img.shields.io/npm/v/react-draggable-resizable.svg?style=flat-square)](https://npmjs.com/package/react-draggable-resizable)
[![Software License](https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square)](LICENSE.md)
[![npm](https://img.shields.io/npm/dt/react-draggable-resizable.svg?style=flat-square)](https://www.npmjs.com/package/react-draggable-resizable)

> React Component for draggable and resizable elements.
## Thanks

非常感谢  @mauricius 他的组件 [vue-draggable-resizable](https://github.com/mauricius/vue-draggable-resizable).

当前第一版本是基于 vue-draggable-resizable 进行的直译 react 版本，后续再重构

## 所有属性都保持和 [vue-draggable-resizable](https://github.com/mauricius/vue-draggable-resizable) 一致，请看他的文档即可

所有的 Events 名称：前面添加 "on"，保持小驼峰

比如: "activated"  --> "onActivated"

## 安装和基础用法

```bash
$ npm install --save react-draggable-resizable-scalable
```

```
import { ReactDraggableResizable } from "/react-draggable-resizable";
import "/react-draggable-resizable/style.css"

const App = () => {
  return (
    <div className="content">
      <div
        style={{
          height: "500px",
          width: "500px",
          border: " 1px solid red",
          position: "relative",
        }}
      >
        <ReactDraggableResizable
          w={100}
          h={100}
          y={10}
          x={30}
          parent="true"
          draggable
          resizable
          active
        >
          <p>
            Hello! I'm a flexible component. You can drag me around and you can
            resize me.
          </p>
        </ReactDraggableResizable>
      </div>
    </div>
  );
};

export default App;

```

## 联系我

please email arvin.haoza@gmail.com


## License

The MIT License (MIT). Please see [License File](LICENSE) for more information.
