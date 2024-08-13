import { ReactDraggableResizable } from "./components/react-draggable-resizable";


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
          w="100"
          h="100"
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
