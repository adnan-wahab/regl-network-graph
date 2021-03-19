import KDBush from 'kdbush'
import withRaf from 'with-raf'
import {
  mat4,
  vec4
} from 'gl-matrix'
import _ from 'lodash'

import processData from './processData';
import createCurves from './curves'
import dom2dCamera from './camera';

import {
  createDrawPoints
} from './points';

import * as d3 from 'd3'

let createBrush = (container, graph, size) => {
  let width = size[0],
    height = size[1]

  const svg = d3.select(container).append("svg")
    .attr("viewBox", [0, 0, width, height])
    .property("value", [])
    svg.style(
    'position', 'absolute'
  )
  //svg.style('top', '50')
  svg.style('left', '0')

  layerStack(svg.node(), 1)

  container.style.position = "relative";
  container.style.width = width + 'px';
  container.style.height = height + 'px';

  const brush = d3.brush()
    .on("end", brushed)
  // .on('end', ()=> {
  //
  //   svg.selectAll('.selection')
  //   .transition().duration(500)
  //   .ease(d3.easeLinear)
  //   .attr('opacity', 0)
  //
  // })

  // const dot = svg.append("g")
  //     .attr("fill", "none")
  //     .attr("stroke", "steelblue")
  //     .attr("stroke-width", 1.5)
  //   .selectAll("g")
  //   .data(data)
  //   .join("circle")
  //     .attr("transform", d => `translate(${x(d.x)},${y(d.y)})`)
  //     .attr("r", 3);

  svg.call(brush);
  svg.selectAll('.selection').attr('stroke', 'green') //.attr('fill', 'dark-green').attr('fill-opacity', .3)

  function brushed() {
    svg.selectAll('.selection').attr('opacity', 1).attr('fill', 'none')

    if (d3.event.selection) {
      graph.brush(d3.event.selection)
      //value = data.filter(d => x0 <= x(d.x) && x(d.x) < x1 && y0 <= y(d.y) && y(d.y) < y1);
    }
    //svg.property("value", value).dispatch("input");
  }
}

import {
  COLOR_ACTIVE_IDX,
  COLOR_BG_IDX,
  COLOR_HOVER_IDX,
  COLOR_NORMAL_IDX,
  COLOR_NUM_STATES,
  DEFAULT_COLOR_BG,
  DEFAULT_COLOR_BY,
  DEFAULT_COLORS,
  DEFAULT_DATA_ASPECT_RATIO,
  DEFAULT_DISTANCE,
  DEFAULT_HEIGHT,
  DEFAULT_SHOW_RECTICLE,
  DEFAULT_RECTICLE_COLOR,
  DEFAULT_POINT_OUTLINE_WIDTH,
  DEFAULT_POINT_SIZE,
  DEFAULT_POINT_SIZE_SELECTED,
  DEFAULT_ROTATION,
  DEFAULT_TARGET,
  DEFAULT_VIEW,
  DEFAULT_WIDTH,
  FLOAT_BYTES
} from './constants'

import {
  checkReglExtensions,
  createRegl,
  createTextureFromUrl,
  dist,
  getBBox,
  isRgb,
  isPointInPolygon,
  isRgba,
  toRgba,
  max,
  min
} from './utils'


let layerStack = (element, i) => {
  if (!element) return console.log('element is null!')
  element.style.position = "absolute";
  element.style.top = 0
  element.style.left = 0;
  element.style.width = '100%';
  element.style.height = '100%';
  element.style.zIndex = i;
}

let createCanvas = (container) => {
  let canvas = document.createElement('canvas')
  console.log('add canvas', container)
  container.appendChild(canvas)
  return canvas
}

const NOOP = () => {}

const creategraph = (options) => {

  let container = options.container || document.body,
    canvas = createCanvas(container),
    initialRegl = createRegl(canvas),


    initialShowRecticle = DEFAULT_SHOW_RECTICLE,
    initialRecticleColor = DEFAULT_RECTICLE_COLOR,
    initialPointSize = DEFAULT_POINT_SIZE,
    initialPointSizeSelected = DEFAULT_POINT_SIZE_SELECTED,
    initialPointOutlineWidth = 2,
    initialWidth = options.width || DEFAULT_WIDTH,
    initialHeight = options.height || DEFAULT_HEIGHT,
    initialTarget = DEFAULT_TARGET,
    initialDistance = DEFAULT_DISTANCE,
    initialRotation = DEFAULT_ROTATION,
    initialView = DEFAULT_VIEW,
    drawNodes = options.createDrawNodes || NOOP,
    onHover = options.onHover || NOOP,
    onClick = options.onClick || NOOP,

    attributes = options.attributes;



  let size = [initialWidth, initialHeight]


  const scratch = new Float32Array(16);
  let mousePosition = [0, 0];
  let pointList = []

  //props schema - make external
  let state = {
    showFavorites: 0,
    ceiling: 40,
    pointSize: 10,
    scaling: .4,
    sizeAttenuation: .1,

    sentimentFilter: 0,
    numNodes: 1,
    showLines: true,
    showNodes: true,
    flatSize: true,
    edgeColors: true,
    selectedPoint: -1,
    favorites: [],
    dateFilter: [0, Infinity],
    camera: {
      view: () => {}
    },
    projection: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
    model: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
    hoveredPoint: -1,
    containerDimensions: {
      x: 0,
      y: 0,
      width: size[0],
      height: size[1]
    },
    size: size
  };
  window.state = state
  window.projection = state.projection

  const getPointSize = () => state.pointSize * window.devicePixelRatio
  const getView = () => {
    return state.camera.view
  }

  const getPositionBuffer = () => {
    return attributes.position
  }
  const getModel = () => {
    return state.model
  }
  const getScaling = () => state.scaling
  const getNormalNumPoints = () => numPoints

  _.extend(state, options.initialState)

  let width = initialWidth
  let height = initialHeight
  let regl = initialRegl || createRegl(canvas)
  let camera
  let mouseDown = false
  let mouseDownPosition = [0, 0]
  let numPoints = 0
  let searchIndex
  let viewAspectRatio
  const dataAspectRatio = DEFAULT_DATA_ASPECT_RATIO

  let isViewChanged = false
  let isInit = false

  const opacity = 1

  let isMouseInCanvas = false

  const initCamera = () => {
    state.camera = dom2dCamera(canvas)
    if (initialView) state.camera.setView(mat4.clone(initialView))
    else state.camera.lookAt([...initialTarget], initialDistance, initialRotation)
  }
  initCamera()
  let [updateCurves, drawCurves] = createCurves(initialRegl, attributes)

  // Get a copy of the current mouse position
  const getMousePos = () => mousePosition.slice()
  const getNdcX = x => -1 + (x / width) * 2
  const getNdcY = y => 1 + (y / height) * -2

  // Get relative WebGL position
  const getMouseGlPos = () => [
    getNdcX(mousePosition[0]),
    getNdcY(mousePosition[1])
  ]

  const getScatterGlPos = (pos = getMouseGlPos()) => {
    const [xGl, yGl] = pos

    //console.log(xGl, yGl)
    // Homogeneous vector
    const v = [xGl, yGl, 1, 1]

    // projection^-1 * view^-1 * model^-1 is the same as
    // model * view^-1 * projection
    let mvp = mat4.invert(
      scratch,
      mat4.multiply(
        scratch,
        state.projection,
        mat4.multiply(scratch, state.camera.view, state.model)
      )
    )

    // Translate vector
    if (!mvp) mvp = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    vec4.transformMat4(v, v, mvp)

    return v.slice(0, 2)
  }

  const raycast = () => {
    let pointSize = 1000; //scale to zoom level
    const [mouseX, mouseY] = getScatterGlPos()
    const scaling = 1 || state.camera.scaling

    const scaledPointSize =
      2 *
      pointSize *
      (min(1.0, scaling) + Math.log2(max(1.0, scaling))) *
      window.devicePixelRatio

    const xNormalizedScaledPointSize = scaledPointSize / width
    const yNormalizedScaledPointSize = scaledPointSize / height

    // Get all points within a close range
    const pointsInBBox = searchIndex.range(
      mouseX - xNormalizedScaledPointSize,
      mouseY - yNormalizedScaledPointSize,
      mouseX + xNormalizedScaledPointSize,
      mouseY + yNormalizedScaledPointSize
    )
    // Find the closest point
    let minDist = scaledPointSize
    let clostestPoint

    pointsInBBox.forEach(idx => {
      const {
        x,
        y
      } = searchIndex.points[idx]
      const d = dist(x, y, mouseX, mouseY)
      if (d < minDist && attributes.stateIndex[1] !== 0) {
        minDist = d
        clostestPoint = idx
      }
    })
    return clostestPoint
    if (minDist < (pointSize / width) * 2) {
      return clostestPoint
    };


    return -1
  }

  const select = (points) => {
    if (typeof points === 'number') {
      //updateCurves(pointList[points], points)
      points = [points]
    }
    console.log(state.selectedPoint = points[0])

    if (!Array.isArray(points)) throw new Error('points must be a number or array')

    drawRaf() // eslint-disable-line no-use-before-define
  }

  let getRelativePosition = (pos) => {
    const rect = canvas.getBoundingClientRect()

    pos[0] = (pos[0] - rect.left) /// devicePixelRatio
    pos[1] = (pos[1] - rect.top) /// devicePixelRatio
    return [...pos]
  }

  const getRelativeMousePosition = event => {
    // if (! canvas.getBoundingClientRect) {
    //   console.log(canvas)
    //   return []
    // }
    const rect = event.target.getBoundingClientRect()

    mousePosition[0] = (event.clientX - rect.left) // / devicePixelRatio
    mousePosition[1] = (event.clientY - rect.top) /// devicePixelRatio

    return [...mousePosition]
  }

  const mouseDownHandler = event => {
    if (!isInit) return
    events['mousedown']()
    mouseDown = true

    mouseDownPosition = getRelativeMousePosition(event)
    mouseDownShift = event.shiftKey


    // fix camera
    //if (mouseDownShift) camera.config({ isFixed: true })
  }

  const mouseUpHandler = () => {
    if (!isInit) return
    events['mouseup']()

    mouseDown = false
  }

  const mouseClickHandler = event => {
    if (!isInit) return
    events['click']()

    const currentMousePosition = getRelativeMousePosition(event)
    const clickDist = dist(...currentMousePosition, ...mouseDownPosition)
    const clostestPoint = raycast()
    // console.log(clostestPoint)
    // attributes.stateIndex.forEach((trip, i) => {
    //   trip[1] = i == clostestPoint ? 10 : -10;
    // })
    if (clostestPoint >= 0) select([clostestPoint])
    //if (clostestPoint >= 0) onClick(pointList[clostestPoint], clostestPoint, event)
    if (clostestPoint >= 0) events['nodeSelected'](pointList[clostestPoint], clostestPoint, event)
    if (event.shiftKey) {
      //updateCurves(pointList)
    } else {}
    //clostestPoint && updateCurves(pointList[clostestPoint], clostestPoint)

  }


  const blurHandler = () => {
    if (!isInit) return;
    events['blur']()
    state.hoveredPoint = -1;
    isMouseInCanvas = false;
    mouseUpHandler();
    drawRaf(); // eslint-disable-line no-use-before-define
  };

  const mouseMoveHandler = event => {
    if (!isInit) return

    // Only ray cast if the mouse cursor is inside
    if (!mouseDown) {
      events['mousemove']()
      let coordinates = getRelativeMousePosition(event)

      const clostestPoint = raycast()
      hover(clostestPoint)
      if (clostestPoint)
        events.hover(clostestPoint, pointList[clostestPoint], event, coordinates) // eslint-disable-line no-use-before-define
      else
        events.hoverOff()
      clostestPoint && updateCurves(pointList[clostestPoint], clostestPoint)

    }
    // Always redraw when mouse as the user might have panned
    if (mouseDown) drawRaf() // eslint-disable-line no-use-before-define
  }

  const updateViewAspectRatio = () => {
    viewAspectRatio = width / height
    state.projection = mat4.fromScaling([], [1 / viewAspectRatio, 1, 1])
    state.model = mat4.fromScaling([], [dataAspectRatio, 1, 1])
  }

  const setHeight = newHeight => {
    if (!+newHeight || +newHeight <= 0) return
    height = +newHeight
    canvas.height = height * window.devicePixelRatio
  }

  const setWidth = newWidth => {
    if (!+newWidth || +newWidth <= 0) return
    width = +newWidth
    canvas.width = width * window.devicePixelRatio
  }


  const drawPointBodies = createDrawPoints(regl, attributes)


  const setPoints = newPoints => {
    isInit = false
    pointList = newPoints
    numPoints = newPoints.length
    searchIndex = new KDBush(newPoints, p => p.x, p => p.y, 16)

    isInit = true
  }

  const draw = () => {
    if (!isInit) return

    //regl.clear({
    //color: [1,1,1,1],
    // color: BG_COLOR,
    //depth: 1
    //})


    // Update camera
    isViewChanged = state.camera.tick()

    //if (state.showLines) drawLines(state)
    //drawEdges(state)
    //drawRecticle(state);

    //if (state.showNodes)
    //
    drawCurves(state)

    drawPointBodies(state);

    if (canvas.toDataUrl)
      state.screenshot = canvas.toDataURL("image/png", 1);

  }

  const drawRaf = withRaf(draw)

  const withDraw = f => (...args) => {
    const out = f(...args)
    drawRaf()
    return out
  }

  /**
   * Update Regl's viewport, drawingBufferWidth, and drawingBufferHeight
   *
   * @description Call this method after the viewport has changed, e.g., width
   * or height have been altered
   */
  const refresh = () => {
    regl.poll()
    state.camera.refresh()
  }

  const setSize = (width, height) => {
    let dpi = window.devicePixelRatio

    canvas.width = dpi * width
    canvas.height = dpi * height

    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'

    setHeight(height)
    setWidth(width)

    updateViewAspectRatio()
    state.camera.refresh()
    refresh()
    drawRaf()
  }

  const hover = (point) => {
    let needsRedraw = false

    if (point >= 0) {
      needsRedraw = true
      const newHoveredPoint = point !== state.hoveredPoint
      state.hoveredPoint = point

    } else {
      needsRedraw = state.hoveredPoint
      state.hoveredPoint = -1

      //if (+needsRedraw >= 0) options.deselect()
    }
    //console.log(state.hoveredPoint)
    drawRaf()
    //if (needsRedraw) drawRaf(console.log(null))
  }

  const reset = () => {
    if (initialView) state.camera.set(mat4.clone(initialView))
    else state.camera.lookAt([...initialTarget], initialDistance, initialRotation)
  }

  const mouseEnterCanvasHandler = () => {
    events['mouseenter']()
    isMouseInCanvas = true
  }

  const mouseLeaveCanvasHandler = () => {
    events['mouseleave']()
    hover()
    isMouseInCanvas = false
    drawRaf()
  }

  let wheelDelta = 0;
  const wheelHandler = (e) => {
    events['wheel'](wheelDelta += e.wheelDelta)
    drawRaf();
    refresh()
  };



  let resizeHandler = () => {
    if (canvas.toBoundingClientRect)
      state.containerDimensions = (canvas).getBoundingClientRect()

    let rect = state.containerDimensions
    size[0] = rect.width
    size[1] = rect.height
    setHeight(height)
    setWidth(width)
    updateViewAspectRatio()
    state.camera.refresh()
  }

  const init = () => {
    updateViewAspectRatio()

    // Set dimensions
    setSize(width, height)


    window.addEventListener('blur', blurHandler, false);
    window.addEventListener('mousedown', mouseDownHandler, false)
    window.addEventListener('mouseup', mouseUpHandler, false)
    window.addEventListener('mousemove', mouseMoveHandler, false)
    canvas.addEventListener('mouseenter', mouseEnterCanvasHandler, false)
    canvas.addEventListener('mouseleave', mouseLeaveCanvasHandler, false)
    canvas.addEventListener('click', mouseClickHandler, false)
    canvas.addEventListener('wheel', wheelHandler);
    window.addEventListener('resize', resizeHandler);
    setPoints(attributes.nodes) //create Index
  }

  const destroy = () => {
    window.removeEventListener('blur', blurHandler, false);
    window.removeEventListener('mousedown', mouseDownHandler, false)
    window.removeEventListener('mouseup', mouseUpHandler, false)
    window.removeEventListener('mousemove', mouseMoveHandler, false)
    canvas.removeEventListener('mouseenter', mouseEnterCanvasHandler, false)
    canvas.removeEventListener('mouseleave', mouseLeaveCanvasHandler, false)
    canvas.removeEventListener('click', mouseClickHandler, false)
    canvas.removeEventListener('wheel', wheelHandler);
    window.removeEventListener('resize', resizeHandler);
    canvas = undefined
    state.camera = undefined
    regl = undefined
  }

  init(canvas)

  const setState = (options) => {
    drawRaf()
    _.each(options, (k, v) => {
      state[v] = k
    })
  }

  let getNodeIndex = (uuid) => {
    return attributes.uuids[uuid]
  }

  let parseColor = (rgb) => {
    let c = d3.rgb(rgb)
    return [c.r / 255, c.g / 255, c.b / 255];
  }

  let eachNode = (indices, property, fn) => {
    let list = Array.isArray(indices) ? indices : attributes.nodes.map((d, i) => i)

    list.forEach(idx => {
      fn(attributes[property][idx], attributes.nodes[idx])
    })
    drawRaf()
  }

  let setNodeColor = (indices, val) => {
    let list = Array.isArray(indices) ? indices : attributes.nodes.map((d, i) => i)

    list.forEach(idx => {
      let color = 'function' == typeof val ? val(attributes.nodes[idx], idx) : val
      idx = typeof idx == 'number' ? idx : getNodeIndex(idx)
      attributes.color[idx] = parseColor(color)
    })
    drawRaf()
  }

  let setNodeVisibility = (indices, val) => {
    //updateCurves(0)
    let list = Array.isArray(indices) ? indices : attributes.nodes.map((d, i) => i)
    list.forEach(idx => {
      let show = 'function' == typeof val ? val(attributes.nodes[idx], idx) : val
      idx = typeof idx == 'number' ? idx : getNodeIndex(idx)
      attributes.stateIndex[idx][1] = show
    })

    drawRaf()

  }

  let setNodeSize = (indices, size) => {
    let list = Array.isArray(indices) ? indices : attributes.nodes.map((d, i) => i)
    indices.forEach(idx => {
      let show = 'function' == typeof val ? val(attributes.nodes[idx], idx) : val
      idx = typeof idx == 'number' ? idx : getNodeIndex(idx)

      attributes.position[idx][2] = size
    })

    drawRaf()

  }

  let setFavorites = (indices) => {
    let list = Array.isArray(indices) ? indices : [indices]
    list.forEach(idx => {
      idx = typeof idx == 'number' ? idx : getNodeIndex(idx)
      attributes.stateIndex[idx][2] = -1
    })

  }

  let setNodeShape = (indices, shape) => {
    let list = Array.isArray(indices) ? indices : [indices]
    list.forEach(idx => {
      idx = typeof idx == 'number' ? idx : getNodeIndex(idx)
      attributes.stateIndex[idx][2] = -shape
    })

    drawRaf()

  }

  let noop = () => {}
  let events = {
    'blur': noop,
    'mousedown': noop,
    'mouseup': noop,
    'mousemove': noop,
    'mouseenter': noop,
    'mouseleave': noop,
    'hoverOff': noop,
    'click': noop,
    'wheel': noop,
    hover: noop,
    'nodeSelected': noop,
  }

  let on = (event, listener) => {
    events[event] = listener

  }

  let saveScreenShot = () => {
    let image = graph.state.screenshot.replace("image/png", "image/octet-stream");

    window.open(image)
  }

  let graph = {
    setFavorites,
    state: state,
    saveScreenShot,
    eachNode: eachNode,
    toggleBrush: (bool) => {
      d3.select('svg').style('display', (!bool) ? 'none' : 'unset')
    },
    brush: (selection, svg) => {
      console.log('wow wtf')
      let clipspace = function (pos) {
        return [2. * (pos[0] / width) - 1.,
          1. - ((pos[1] / height) * 2.)
        ]
      }

      let p = selection.map(clipspace).map(getScatterGlPos)

      let [
        [x0, y0],
        [x1, y1]
      ] = p;
      let poop
      let c = 0
      attributes.stateIndex.forEach((trip, idx) => {
        let {
          x,
          y
        } = searchIndex.points[idx];
        let inbox = x > Math.min(x0, x1) &&
          x < Math.max(x1, x0) &&
          y > Math.min(y1, y0) &&
          y < Math.max(y1, y0)
        //isPointInPolygon([clipX, clipY], p)
        if (inbox) c++
        poop = [x0, x, x1, y0, y, y1]
        trip[1] = inbox ? 10 : -20;
      })
      console.log(window.poop = poop)
      console.log(c)
      draw()


    },

    resetView: () => {
      state.camera.setView(mat4.clone(initialView))
      draw()


    },
    zoomToNode: (id) => {
      let pos = attributes.position[id]
      let xy = pos.slice(0, 2)
      camera.lookAt(xy)
      draw()

    },
    setSize,
    setNodeColor,
    setNodeSize,
    setNodeShape,
    setNodeVisibility,
    destroy,
    on: on,
    repaint: () => {
      withDraw(reset)();
    },
    refresh,
    reset: withDraw(reset),
    select,
    setState,
    getView,
  }

  if (options.brush) createBrush(document.body, graph, size)
  return graph
}


const init = (props) => {
  console.log('INIT okay')
  props.attributes = processData(props.data)
  let graph = creategraph(props)
  graph._data = props
  return graph
}

export default {
  init
}

export {
  createRegl,
  createTextureFromUrl
}