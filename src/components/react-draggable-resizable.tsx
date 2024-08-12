import { useEffect, useRef, useState, useMemo } from "react";
import {
  matchesSelectorToParentElements,
  getComputedSize,
  addEvent,
  removeEvent,
} from "../utils/dom";
import {
  computeWidth,
  computeHeight,
  restrictToBounds,
  snapToGrid,
} from "../utils/fns";

const events = {
  mouse: {
    start: "mousedown",
    move: "mousemove",
    stop: "mouseup",
  },
  touch: {
    start: "touchstart",
    move: "touchmove",
    stop: "touchend",
  },
};

const userSelectNone = {
  userSelect: "none",
  MozUserSelect: "none",
  WebkitUserSelect: "none",
  MsUserSelect: "none",
} as const;

const userSelectAuto = {
  userSelect: "auto",
  MozUserSelect: "auto",
  WebkitUserSelect: "auto",
  MsUserSelect: "auto",
} as const;

let eventsFor = events.mouse;

//
const ReactDraggableResizableCore = (props: any) => {
  const {
    className,
    classNameDraggable,
    classNameResizable,
    classNameDragging,
    classNameResizing,
    classNameActive,
    classNameHandle,
    disableUserSelect,
    enableNativeDrag,
    preventDeactivation,
    active,
    draggable,
    resizable,
    lockAspectRatio,
    w,
    x,
    y,
    h,
    z,
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
    dragHandle,
    dragCancel,
    axis,
    parent,
    scale,
    onDrag,
    onDragStart,
    onResizeStart,
    onResize,
    handles,
    grid,
  } = props;
  const [localState, setLocalState] = useState(
    () =>
      ({
        left: props.x,
        top: props.y,
        right: null,
        bottom: null,

        width: null,
        height: null,

        widthTouched: false,
        heightTouched: false,

        aspectFactor: null,

        parentWidth: null,
        parentHeight: null,
        handle: null,
        enabled: props.active,
        resizing: false,
        dragging: false,
        dragEnable: false,
        resizeEnable: false,
        zIndex: props.z,
      } as any)
  );

  let {
    aspectFactor,
    bottom,
    dragEnable,
    dragging,
    enabled,
    handle,
    height,
    heightTouched,
    left,
    parentHeight,
    parentWidth,
    resizeEnable,
    resizing,
    right,
    top,
    width,
    widthTouched,
    zIndex,
  } = localState;
  const $elRef = useRef({} as any);
  const mouseClickPositionRef = useRef({} as any);
  const boundsRef = useRef({} as any);

  const computedWidth = useMemo(() => {
    if (w === "auto") {
      if (!widthTouched) {
        return "auto";
      }
    }

    return width + "px";
  }, [widthTouched, w, width]);
  const actualHandles = useMemo(() => {
    if (!resizable) return [];

    return handles;
  }, [handles, resizable]);
  const computedHeight = useMemo(() => {
    if (h === "auto") {
      if (!heightTouched) {
        return "auto";
      }
    }

    return height + "px";
  }, [height, h, heightTouched]);
  const minW = useMemo(() => {
    return minWidth;
  }, [minWidth]);
  const minH = useMemo(() => {
    return minHeight;
  }, [minHeight]);
  const maxW = useMemo(() => {
    return maxWidth;
  }, [maxWidth]);
  const maxH = useMemo(() => {
    return maxHeight;
  }, [maxHeight]);
  const resizingOnX = useMemo(() => {
    return Boolean(handle) && (handle.includes("l") || handle.includes("r"));
  }, [handle]);
  const resizingOnY = useMemo(() => {
    return Boolean(handle) && (handle.includes("t") || handle.includes("b"));
  }, [handle]);
  const isCornerHandle = useMemo(() => {
    return Boolean(handle) && ["tl", "tr", "br", "bl"].includes(handle);
  }, [handle]);

  const style = (() => {
    return {
      transform: `translate(${left}px, ${top}px)`,
      width: computedWidth,
      height: computedHeight,
      zIndex: zIndex,
      ...(dragging && disableUserSelect ? userSelectNone : userSelectAuto),
    };
  })();
  const resetBoundsAndMouseState = () => {
    mouseClickPositionRef.current = {
      mouseX: 0,
      mouseY: 0,
      x: 0,
      y: 0,
      w: 0,
      h: 0,
    };

    boundsRef.current = {
      minLeft: null,
      maxLeft: null,
      minRight: null,
      maxRight: null,
      minTop: null,
      maxTop: null,
      minBottom: null,
      maxBottom: null,
    };
  };
  const checkParentSize = () => {
    if (parent) {
      const [newParentWidth, newParentHeight] = getParentSize();

      parentWidth = newParentWidth;
      parentHeight = newParentHeight;
      right = parentWidth - width - left;
      bottom = parentHeight - height - top;
    }
  };
  const getParentSize = () => {
    if (parent) {
      const style = window.getComputedStyle($elRef.current.parentNode, null);

      return [
        parseInt(style.getPropertyValue("width"), 10),
        parseInt(style.getPropertyValue("height"), 10),
      ];
    }

    return [null, null];
  };
  const elementTouchDown = (e: any) => {
    eventsFor = events.touch;

    elementDown(e);
  };
  const elementMouseDown = (e: any) => {
    eventsFor = events.mouse;

    elementDown(e);
  };
  const elementDown = (e: any) => {
    if (e instanceof MouseEvent && e.button !== 0) {
      return;
    }

    const target = e.target || e.srcElement;

    if ($elRef.current.contains(target)) {
      if (onDragStart(e) === false) {
        return;
      }

      if (
        (dragHandle &&
          !matchesSelectorToParentElements(
            target,
            dragHandle,
            $elRef.current
          )) ||
        (dragCancel &&
          matchesSelectorToParentElements(target, dragCancel, $elRef.current))
      ) {
        dragging = false;

        return;
      }

      if (!enabled) {
        enabled = true;
        props.onActivated?.();
        props.onActive?.(true);
      }

      if (draggable) {
        dragEnable = true;
      }

      const mouseClickPosition = mouseClickPositionRef.current;

      mouseClickPosition.mouseX = e.touches ? e.touches[0].pageX : e.pageX;
      mouseClickPosition.mouseY = e.touches ? e.touches[0].pageY : e.pageY;

      mouseClickPosition.left = left;
      mouseClickPosition.right = right;
      mouseClickPosition.top = top;
      mouseClickPosition.bottom = bottom;

      if (parent) {
        boundsRef.current = calcDragLimits();
      }

      addEvent(document.documentElement, eventsFor.move, move);
      addEvent(document.documentElement, eventsFor.stop, handleUp);
    }
  };
  const calcDragLimits = () => {
    return {
      minLeft: left % grid[0],
      maxLeft:
        Math.floor((parentWidth - width - left) / grid[0]) * grid[0] + left,
      minRight: right % grid[0],
      maxRight:
        Math.floor((parentWidth - width - right) / grid[0]) * grid[0] + right,
      minTop: top % grid[1],
      maxTop:
        Math.floor((parentHeight - height - top) / grid[1]) * grid[1] + top,
      minBottom: bottom % grid[1],
      maxBottom:
        Math.floor((parentHeight - height - bottom) / grid[1]) * grid[1] +
        bottom,
    };
  };
  const deselect = (e: any) => {
    const target = e.target || e.srcElement;
    const regex = new RegExp(className + "-([trmbl]{2})", "");

    if (!$elRef.current.contains(target) && !regex.test(target.className)) {
      if (enabled && !preventDeactivation) {
        enabled = false;
        props.onDeactivated?.();
        props.onActive?.(false);
      }

      removeEvent(document.documentElement, eventsFor.move, handleResize);
    }

    resetBoundsAndMouseState();
  };
  const handleTouchDown = (handle: any, e: any) => {
    eventsFor = events.touch;

    handleDown(handle, e);
  };
  const handleDown = (handle: any, e: any) => {
    // stop preeve
    if (e instanceof MouseEvent && e.which !== 1) {
      return;
    }

    if (onResizeStart(handle, e) === false) {
      return;
    }

    if (e.stopPropagation) e.stopPropagation();

    // Here we avoid a dangerous recursion by faking
    // corner handles as middle handles
    if (lockAspectRatio && !handle.includes("m")) {
      handle = "m" + handle.substring(1);
    } else {
      handle = handle;
    }

    resizeEnable = true;
    const mouseClickPosition = mouseClickPositionRef.current;
    mouseClickPosition.mouseX = e.touches ? e.touches[0].pageX : e.pageX;
    mouseClickPosition.mouseY = e.touches ? e.touches[0].pageY : e.pageY;
    mouseClickPosition.left = left;
    mouseClickPosition.right = right;
    mouseClickPosition.top = top;
    mouseClickPosition.bottom = bottom;

    boundsRef.current = calcResizeLimits();

    addEvent(document.documentElement, eventsFor.move, handleResize);
    addEvent(document.documentElement, eventsFor.stop, handleUp);
  };
  const calcResizeLimits = () => {
    let minW = props.minW;
    let minH = props.minH;
    let maxW = props.maxW;
    let maxH = props.maxH;

    const aspectFactor = props.aspectFactor;
    const [gridX, gridY] = props.grid;
    const width = props.width;
    const height = props.height;
    const left = props.left;
    const top = props.top;
    const right = props.right;
    const bottom = props.bottom;

    if (lockAspectRatio) {
      if (minW / minH > aspectFactor) {
        minH = minW / aspectFactor;
      } else {
        minW = aspectFactor * minH;
      }

      if (maxW && maxH) {
        maxW = Math.min(maxW, aspectFactor * maxH);
        maxH = Math.min(maxH, maxW / aspectFactor);
      } else if (maxW) {
        maxH = maxW / aspectFactor;
      } else if (maxH) {
        maxW = aspectFactor * maxH;
      }
    }

    maxW = maxW - (maxW % gridX);
    maxH = maxH - (maxH % gridY);

    const limits = {
      minLeft: null,
      maxLeft: null,
      minTop: null,
      maxTop: null,
      minRight: null,
      maxRight: null,
      minBottom: null,
      maxBottom: null,
    } as any;

    if (parent) {
      limits.minLeft = left % gridX;
      limits.maxLeft = left + Math.floor((width - minW) / gridX) * gridX;
      limits.minTop = top % gridY;
      limits.maxTop = top + Math.floor((height - minH) / gridY) * gridY;
      limits.minRight = right % gridX;
      limits.maxRight = right + Math.floor((width - minW) / gridX) * gridX;
      limits.minBottom = bottom % gridY;
      limits.maxBottom = bottom + Math.floor((height - minH) / gridY) * gridY;

      if (maxW) {
        limits.minLeft = Math.max(limits.minLeft, parentWidth - right - maxW);
        limits.minRight = Math.max(limits.minRight, parentWidth - left - maxW);
      }

      if (maxH) {
        limits.minTop = Math.max(limits.minTop, parentHeight - bottom - maxH);
        limits.minBottom = Math.max(
          limits.minBottom,
          parentHeight - top - maxH
        );
      }

      if (lockAspectRatio) {
        limits.minLeft = Math.max(limits.minLeft, left - top * aspectFactor);
        limits.minTop = Math.max(limits.minTop, top - left / aspectFactor);
        limits.minRight = Math.max(
          limits.minRight,
          right - bottom * aspectFactor
        );
        limits.minBottom = Math.max(
          limits.minBottom,
          bottom - right / aspectFactor
        );
      }
    } else {
      limits.minLeft = null;
      limits.maxLeft = left + Math.floor((width - minW) / gridX) * gridX;
      limits.minTop = null;
      limits.maxTop = top + Math.floor((height - minH) / gridY) * gridY;
      limits.minRight = null;
      limits.maxRight = right + Math.floor((width - minW) / gridX) * gridX;
      limits.minBottom = null;
      limits.maxBottom = bottom + Math.floor((height - minH) / gridY) * gridY;

      if (maxW) {
        limits.minLeft = -(right + maxW);
        limits.minRight = -(left + maxW);
      }

      if (maxH) {
        limits.minTop = -(bottom + maxH);
        limits.minBottom = -(top + maxH);
      }

      if (lockAspectRatio && maxW && maxH) {
        limits.minLeft = Math.min(limits.minLeft, -(right + maxW));
        limits.minTop = Math.min(limits.minTop, -(maxH + bottom));
        limits.minRight = Math.min(limits.minRight, -left - maxW);
        limits.minBottom = Math.min(limits.minBottom, -top - maxH);
      }
    }

    return limits;
  };
  const move = (e: any) => {
    if (resizing) {
      handleResize(e);
    } else if (dragEnable) {
      handleDrag(e);
    }
  };
  const handleDrag = (e: any) => {
    const axis = props.axis;
    const grid = props.grid;
    const bounds = boundsRef.current;
    const mouseClickPosition = mouseClickPositionRef.current;

    const tmpDeltaX =
      axis && axis !== "y"
        ? mouseClickPosition.mouseX - (e.touches ? e.touches[0].pageX : e.pageX)
        : 0;
    const tmpDeltaY =
      axis && axis !== "x"
        ? mouseClickPosition.mouseY - (e.touches ? e.touches[0].pageY : e.pageY)
        : 0;

    const [deltaX, deltaY] = snapToGrid(grid, tmpDeltaX, tmpDeltaY, scale);

    const left = restrictToBounds(
      mouseClickPosition.left - deltaX,
      bounds.minLeft,
      bounds.maxLeft
    );
    const top = restrictToBounds(
      mouseClickPosition.top - deltaY,
      bounds.minTop,
      bounds.maxTop
    );

    if (onDrag(left, top) === false) {
      return;
    }

    const right = restrictToBounds(
      mouseClickPosition.right + deltaX,
      bounds.minRight,
      bounds.maxRight
    );
    const bottom = restrictToBounds(
      mouseClickPosition.bottom + deltaY,
      bounds.minBottom,
      bounds.maxBottom
    );

    setLocalState((state: any) => {
      return {
        ...state,
        left,
        right,
        top,
        bottom,
      };
    });

    props.onDragging?.(left, top);
    dragging = true;
  };
  const moveHorizontally = (val: any) => {
    // should calculate with scale 1.
    const [deltaX, _] = snapToGrid(grid, val, top, 1);
    const bounds = boundsRef.current;
    const left = restrictToBounds(deltaX, bounds.minLeft, bounds.maxLeft);

    setLocalState((state: any) => {
      return {
        ...state,
        left,
        right: parentWidth - width - left,
      };
    });
  };
  const moveVertically = (val: any) => {
    // should calculate with scale 1.
    const [_, deltaY] = snapToGrid(grid, left, val, 1);
    const bounds = boundsRef.current;
    const top = restrictToBounds(deltaY, bounds.minTop, bounds.maxTop);

    setLocalState((state: any) => {
      return {
        ...state,
        top,
        bottom: parentHeight - height - top,
      };
    });
  };
  const handleResize = (e: any) => {
    let left = localState.left;
    let top = localState.top;
    let right = localState.right;
    let bottom = localState.bottom;

    const mouseClickPosition = mouseClickPositionRef.current;
    const aspectFactor = localState.aspectFactor;

    const tmpDeltaX =
      mouseClickPosition.mouseX - (e.touches ? e.touches[0].pageX : e.pageX);
    const tmpDeltaY =
      mouseClickPosition.mouseY - (e.touches ? e.touches[0].pageY : e.pageY);

    if (!widthTouched && tmpDeltaX) {
      widthTouched = true;
    }

    if (!heightTouched && tmpDeltaY) {
      heightTouched = true;
    }

    const [deltaX, deltaY] = snapToGrid(grid, tmpDeltaX, tmpDeltaY, scale);
    const bounds = boundsRef.current;
    if (handle.includes("b")) {
      bottom = restrictToBounds(
        mouseClickPosition.bottom + deltaY,
        bounds.minBottom,
        bounds.maxBottom
      );

      if (lockAspectRatio && resizingOnY) {
        right = right - (bottom - bottom) * aspectFactor;
      }
    } else if (handle.includes("t")) {
      top = restrictToBounds(
        mouseClickPosition.top - deltaY,
        bounds.minTop,
        bounds.maxTop
      );

      if (lockAspectRatio && resizingOnY) {
        left = left - (top - top) * aspectFactor;
      }
    }

    if (handle.includes("r")) {
      right = restrictToBounds(
        mouseClickPosition.right + deltaX,
        bounds.minRight,
        bounds.maxRight
      );

      if (lockAspectRatio && resizingOnX) {
        bottom = bottom - (right - right) / aspectFactor;
      }
    } else if (handle.includes("l")) {
      left = restrictToBounds(
        mouseClickPosition.left - deltaX,
        bounds.minLeft,
        bounds.maxLeft
      );

      if (lockAspectRatio && resizingOnX) {
        top = top - (left - left) / aspectFactor;
      }
    }

    const width = computeWidth(parentWidth, left, right);
    const height = computeHeight(parentHeight, top, bottom);

    if (onResize(handle, left, top, width, height) === false) {
      return;
    }

    setLocalState((state: any) => {
      return {
        ...state,
        left,
        top,
        right,
        width,
        bottom,
        height,
      };
    });
    props.onResizing?.(left, top, width, height);
    resizing = true;
  };
  const changeWidth = (val: number) => {
    // should calculate with scale 1.
    const [newWidth, _] = snapToGrid(grid, val, 0, 1);
    const bounds = boundsRef.current;
    const right = restrictToBounds(
      parentWidth - newWidth - left,
      bounds.minRight,
      bounds.maxRight
    );
    let bottom = props.bottom;

    if (lockAspectRatio) {
      bottom = bottom - (right - right) / aspectFactor;
    }

    const width = computeWidth(parentWidth, left, right);
    const height = computeHeight(parentHeight, top, bottom);

    setLocalState((state: any) => {
      return {
        ...state,
        right,
        width,
        bottom,
        height,
      };
    });
  };
  const changeHeight = (val: number) => {
    // should calculate with scale 1.
    const [_, newHeight] = snapToGrid(grid, 0, val, 1);
    const bounds = boundsRef.current;
    const bottom = restrictToBounds(
      parentHeight - newHeight - top,
      bounds.minBottom,
      bounds.maxBottom
    );
    let right = props.right;

    if (lockAspectRatio) {
      right = right - (bottom - bottom) * aspectFactor;
    }

    const width = computeWidth(parentWidth, left, right);
    const height = computeHeight(parentHeight, top, bottom);

    setLocalState((state: any) => {
      return {
        ...state,
        right,
        width,
        bottom,
        height,
      };
    });
  };
  const handleUp = (e: any) => {
    handle = null;

    resetBoundsAndMouseState();

    dragEnable = false;
    resizeEnable = false;

    if (resizing) {
      resizing = false;
      props.onResizeStop?.(left, top, width, height);
    }

    if (dragging) {
      dragging = false;
      props.onDragStop?.(left, top);
    }

    removeEvent(document.documentElement, eventsFor.move, handleResize);
  };

  useEffect(() => {
    // eslint-disable-next-line
    if (props.maxWidth && props.minWidth > props.maxWidth)
      console.warn(
        "[Vdr warn]: Invalid prop: minWidth cannot be greater than maxWidth"
      );
    // eslint-disable-next-line
    if (props.maxHeight && props.minHeight > props.maxHeight)
      console.warn(
        "[Vdr warn]: Invalid prop: minHeight cannot be greater than maxHeight"
      );

    resetBoundsAndMouseState();
  }, []);

  useEffect(() => {
    setLocalState((state: any) => ({
      ...state,
      enabled: active,
    }));

    if (active) {
      props.onActivated?.();
    } else {
      props.onDeactivated?.();
    }
  }, [active]);
  useEffect(() => {
    if (z >= 0 || z === "auto") {
      setLocalState((state: any) => ({
        ...state,
        zIndex: z,
      }));
    }
  }, [z]);
  useEffect(() => {
    if (resizing || dragging) {
      return;
    }

    if (parent) {
      boundsRef.current = calcDragLimits();
    }

    moveHorizontally(x);
  }, [x]);
  useEffect(() => {
    if (resizing || dragging) {
      return;
    }

    if (parent) {
      boundsRef.current = calcDragLimits();
    }

    moveVertically(y);
  }, [y]);
  useEffect(() => {
    let aspectFactor;
    if (lockAspectRatio) {
      aspectFactor = width / height;
    } else {
      aspectFactor = undefined;
    }
    setLocalState((state: any) => ({
      ...state,
      aspectFactor,
    }));
  }, [lockAspectRatio]);
  useEffect(() => {
    if (resizing || dragging) {
      return;
    }

    if (parent) {
      boundsRef.current = calcResizeLimits();
    }

    changeWidth(w);
  }, [w]);
  useEffect(() => {
    if (resizing || dragging) {
      return;
    }

    if (parent) {
      boundsRef.current = calcResizeLimits();
    }

    changeHeight(h);
  }, [h]);

  const classNames = [
    enabled && classNameActive,
    dragging && classNameDragging,
    resizing && classNameResizing,
    draggable && classNameDraggable,
    resizable && classNameResizable,
    className,
  ].filter(Boolean);
  return (
    <div
      ref={$elRef}
      style={style}
      className={classNames.join(" ")}
      onMouseDown={elementMouseDown}
      onTouchStart={elementTouchDown}
    >
      {actualHandles.map((handle: string) => (
        <div
          key={handle}
          className={[classNameHandle, classNameHandle + "-" + handle].join(
            " "
          )}
          style={{ display: enabled ? "block" : "none" }}
          onMouseDown={(event) => handleDown(handle, event)}
          onTouchStart={(event) => handleTouchDown(handle, event)}
        >
          {props.handleSlot}
        </div>
      ))}
      {props.children}
    </div>
  );
};

export const ReactDraggableResizable = (props: any) => {
  const composeProps = useMemo(() => {
    const {
      className = "vdr",
      classNameDraggable = "draggable",
      classNameResizable = "resizable",
      classNameDragging = "dragging",
      classNameResizing = "resizing",
      classNameActive = "active",
      classNameHandle = "handle",
      disableUserSelect = true,
      enableNativeDrag = false,
      preventDeactivation = false,
      active = false,
      draggable = true,
      resizable = true,
      lockAspectRatio = false,
      w = 200,
      x = 0,
      y = 0,
      h = 200,
      z = null,
      minWidth = 0,
      minHeight = 0,
      maxWidth = null,
      maxHeight = null,
      dragHandle = null,
      dragCancel = null,
      axis = [1, 1],
      parent = false,
      scale = 1,
      onDrag = () => true,
      onDragStart = () => true,
      onResizeStart = () => true,
      onResize = () => true,
      handles = ["tl", "tm", "tr", "mr", "br", "bm", "bl", "ml"],
      grid = [1, 1],
    } = props;

    const propertis = {
      className,
      classNameDraggable,
      classNameResizable,
      classNameDragging,
      classNameResizing,
      classNameActive,
      classNameHandle,
      disableUserSelect,
      enableNativeDrag,
      preventDeactivation,
      active,
      draggable,
      resizable,
      lockAspectRatio,
      w,
      x,
      y,
      h,
      z,
      minWidth,
      minHeight,
      maxWidth,
      maxHeight,
      dragHandle,
      dragCancel,
      axis,
      parent,
      scale,
      onDrag,
      onDragStart,
      onResizeStart,
      onResize,
      handles,
      grid,
    };

    return {
      ...propertis,
      props,
    };
  }, [props]);

  return (
    <ReactDraggableResizableCore {...composeProps}>
      {props.children}
    </ReactDraggableResizableCore>
  );
};
