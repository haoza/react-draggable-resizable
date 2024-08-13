<p align="center"><img src="https://rawgit.com/mauricius/react-draggable-resizable/v1/docs/resources/logo.png" alt="logo"></p>
<h1 align="center">ReactDraggableResizable</h1>

## [中文文档](https://github.com/haoza/react-draggable-resizable/blob/main/README-zh.md)

[![Latest Version on NPM](https://img.shields.io/npm/v/react-draggable-resizable.svg?style=flat-square)](https://npmjs.com/package/react-draggable-resizable)
[![Software License](https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square)](LICENSE.md)
[![npm](https://img.shields.io/npm/dt/react-draggable-resizable.svg?style=flat-square)](https://www.npmjs.com/package/react-draggable-resizable)

> React Component for draggable and resizable elements.
## Thanks

Thanks to @mauricius for his work on [vue-draggable-resizable](https://github.com/mauricius/vue-draggable-resizable) component.

The current first version is a direct translation of react based on vue-draggable-resizable, which will be refactored later.

## All properties and interfaces are consistent with [vue-draggable-resizable](https://github.com/mauricius/vue-draggable-resizable)

all Events: add "on" in front of its name.

eq: "activated"  --> "onActivated"



## Install and basic usage

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

## Contact me

please email arvin.haoza@gmail.com


## License

The MIT License (MIT). Please see [License File](LICENSE) for more information.
