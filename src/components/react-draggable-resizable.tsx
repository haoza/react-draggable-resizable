import { useEffect, useRef, useState, useMemo, useLayoutEffect } from "react";
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

import "./react-draggable-resizable.css";

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
        widthTouched: false,
        heightTouched: false,

        aspectFactor: null,
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
    dragEnable,
    dragging,
    enabled,
    heightTouched,
    resizeEnable,
    resizing,
    widthTouched,
    zIndex,
  } = localState;
  const $elRef = useRef({} as any);
  const mouseClickPositionRef = useRef({} as any);
  const boundsRef = useRef({} as any);
  const handleRef = useRef<string>("");
  const positionRef = useRef({
    left: props.x || 0,
    right: 0,
    top: props.y || 0,
    bottom: 0,
    width: 0,
    height: 0,
  });
  const parentStyleRef = useRef({ parentHeight: 0, parentWidth: 0 });

  const computedWidth = useMemo(() => {
    if (w === "auto") {
      if (!widthTouched) {
        return "auto";
      }
    }

    return positionRef.current.width + "px";
  }, [widthTouched, w, positionRef.current.width]);
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

    return positionRef.current.height + "px";
  }, [positionRef.current.height, h, heightTouched]);

  const resizingOnX = useMemo(() => {
    const handle = handleRef.current;
    return Boolean(handle) && (handle.includes("l") || handle.includes("r"));
  }, [handleRef.current]);
  const resizingOnY = useMemo(() => {
    const handle = handleRef.current;
    return Boolean(handle) && (handle.includes("t") || handle.includes("b"));
  }, [handleRef.current]);
  const isCornerHandle = useMemo(() => {
    const handle = handleRef.current;
    return Boolean(handle) && ["tl", "tr", "br", "bl"].includes(handle);
  }, []);

  const style = (() => {
    return {
      transform: `translate(${positionRef.current.left}px, ${positionRef.current.top}px)`,
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
      parentStyleRef.current = {
        parentWidth: newParentWidth,
        parentHeight: newParentHeight,
      };
      positionRef.current.right =
        newParentWidth - positionRef.current.width - positionRef.current.left;
      positionRef.current.bottom =
        newParentHeight - positionRef.current.height - positionRef.current.top;
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

    return [0, 0];
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

      mouseClickPosition.left = positionRef.current.left;
      mouseClickPosition.right = positionRef.current.right;
      mouseClickPosition.top = positionRef.current.top;
      mouseClickPosition.bottom = positionRef.current.bottom;

      if (parent) {
        boundsRef.current = calcDragLimits();
      }

      addEvent(document.documentElement, eventsFor.move, move);
      addEvent(document.documentElement, eventsFor.stop, handleUp);
    }
  };
  const calcDragLimits = () => {
    const { bottom, height, left, right, top, width } = positionRef.current;
    const { parentWidth, parentHeight } = parentStyleRef.current;
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
  const handleDown = (
    handle: any,
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    e.preventDefault();
    if (e instanceof MouseEvent && e.which !== 1) {
      return;
    }

    if (onResizeStart(handle, e) === false) {
      return;
    }

    if (e.stopPropagation) e.stopPropagation();

    // Here we avoid a dangerous recursion by faking
    // corner handles as middle handles
    let targetHandle;
    if (lockAspectRatio && !handle.includes("m")) {
      targetHandle = "m" + handle.substring(1);
    } else {
      targetHandle = handle;
    }

    resizeEnable = true;

    handleRef.current = targetHandle;
    setLocalState((state: any) => {
      return {
        ...state,
        resizeEnable,
      };
    });

    const { bottom, left, right, top } = positionRef.current;
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
    let minW = minWidth;
    let minH = minHeight;
    let maxW = maxWidth;
    let maxH = maxHeight;

    const aspectFactor = localState.aspectFactor;
    const [gridX, gridY] = props.grid;
    const width = positionRef.current.width;
    const height = positionRef.current.height;
    const left = positionRef.current.left;
    const top = positionRef.current.top;
    const right = positionRef.current.right;
    const bottom = positionRef.current.bottom;

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
      const { parentWidth, parentHeight } = parentStyleRef.current;
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

    positionRef.current.left = left;
    positionRef.current.right = right;
    positionRef.current.top = top;
    positionRef.current.bottom = bottom;

    setLocalState((state: any) => {
      return {
        ...state,
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

    const { parentWidth } = parentStyleRef.current;

    positionRef.current.left = left;
    positionRef.current.right = parentWidth - positionRef.current.width - left;

    setLocalState((state: any) => {
      return {
        ...state,
      };
    });
  };
  const moveVertically = (val: any) => {
    // should calculate with scale 1.
    const [_, deltaY] = snapToGrid(grid, positionRef.current.left, val, 1);
    const bounds = boundsRef.current;
    const top = restrictToBounds(deltaY, bounds.minTop, bounds.maxTop);

    const { parentWidth, parentHeight } = parentStyleRef.current;

    positionRef.current.top = top;
    positionRef.current.bottom =
      parentHeight - positionRef.current.height - top;
    setLocalState((state: any) => {
      return {
        ...state,
      };
    });
  };
  const handleResize = (e: any) => {
    let { bottom, height, left, right, top, width } = positionRef.current;

    const handle = handleRef.current;

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

    const { parentWidth, parentHeight } = parentStyleRef.current;
    width = computeWidth(parentWidth, left, right);
    height = computeHeight(parentHeight, top, bottom);

    if (onResize(handle, left, top, width, height) === false) {
      return;
    }

    positionRef.current.left = left;
    positionRef.current.right = right;
    positionRef.current.top = top;
    positionRef.current.bottom = bottom;
    positionRef.current.height = height;
    positionRef.current.width = width;

    setLocalState((state: any) => {
      return {
        ...state,
      };
    });
    props.onResizing?.(left, top, width, height);
    resizing = true;
  };
  // const changeWidth = (val: number) => {
  //   // should calculate with scale 1.

  //   const { parentWidth, parentHeight } = parentStyleRef.current;
  //   const [newWidth, _] = snapToGrid(grid, val, 0, 1);
  //   const bounds = boundsRef.current;
  //   const right = restrictToBounds(
  //     parentWidth - newWidth - positionRef.current.left,
  //     bounds.minRight,
  //     bounds.maxRight
  //   );
  //   let bottom = props.bottom;

  //   if (lockAspectRatio) {
  //     bottom = bottom - (right - right) / aspectFactor;
  //   }

  //   const width = computeWidth(parentWidth, positionRef.current.left, right);
  //   const height = computeHeight(parentHeight, top, bottom);

  //   positionRef.current.right = right;
  //   positionRef.current.bottom = bottom;
  //   positionRef.current.width = width;
  //   positionRef.current.height = height;

  //   setLocalState((state: any) => {
  //     return {
  //       ...state,
  //     };
  //   });
  // };
  const changeHeight = (val: number) => {
    // should calculate with scale 1.

    const { parentWidth, parentHeight } = parentStyleRef.current;
    const [_, newHeight] = snapToGrid(grid, 0, val, 1);
    const bounds = boundsRef.current;
    const bottom = restrictToBounds(
      parentHeight - newHeight - positionRef.current.top,
      bounds.minBottom,
      bounds.maxBottom
    );
    let right = positionRef.current.right;

    if (lockAspectRatio) {
      right = right - (bottom - bottom) * aspectFactor;
    }

    const width = computeWidth(parentWidth, positionRef.current.left, right);
    const height = computeHeight(
      parentHeight,
      positionRef.current.top,
      positionRef.current.bottom
    );

    positionRef.current.bottom = bottom;
    positionRef.current.right = right;
    positionRef.current.width = width;
    positionRef.current.height = height;


    setLocalState((state: any) => {
      return {
        ...state,
      };
    });
  };
  const handleUp = (e: any) => {
    handleRef.current = "";

    const { bottom, height, left, right, top, width } = positionRef.current;
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
      aspectFactor = positionRef.current.width / positionRef.current.height;
    } else {
      aspectFactor = undefined;
    }
    setLocalState((state: any) => ({
      ...state,
      aspectFactor,
    }));
  }, [lockAspectRatio]);

  useLayoutEffect(() => {
    if (!enableNativeDrag) {
      $elRef.current.ondragstart = () => false;
    }

    const [parentWidth, parentHeight] = getParentSize();

    const [width, height] = getComputedSize($elRef.current);

    if (active) {
      props.onActivated?.();
    }
    parentStyleRef.current = {
      parentWidth,
      parentHeight,
    };

    positionRef.current.width = w !== "auto" ? w : width;
    positionRef.current.right = parentWidth - width - positionRef.current.left;
    positionRef.current.height = h !== "auto" ? h : height;
    positionRef.current.bottom =
      parentHeight - height - positionRef.current.top;


      $elRef.current.style.width = positionRef.current.width + "px";
      $elRef.current.style.height = positionRef.current.height + "px";
    setLocalState((state: any) => {
      return {
        ...state,
        aspectFactor: (w !== "auto" ? w : width) / (h !== "auto" ? h : height),
      };
    });

    addEvent(document.documentElement, "mousedown", deselect);
    addEvent(document.documentElement, "touchend touchcancel", deselect);

    addEvent(window, "resize", checkParentSize);

    return () => {
      removeEvent(document.documentElement, "mousedown", deselect);
      removeEvent(document.documentElement, "touchstart", handleUp);
      removeEvent(document.documentElement, "mousemove", move);
      removeEvent(document.documentElement, "touchmove", move);
      removeEvent(document.documentElement, "mouseup", handleUp);
      removeEvent(document.documentElement, "touchend touchcancel", deselect);

      removeEvent(window, "resize", checkParentSize);
    };
  }, []);

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
