
import circleSprite from './sprites/border.png'
import starSprite from './sprites/binky.png'

let circleImg = new Image(
)

let starImg = new Image()
starImg.src = starSprite;

circleImg.src = circleSprite;

const POINT_FS = `
#ifdef GL_OES_standard_derivatives
#extension GL_OES_standard_derivatives : enable
#endif
precision mediump float;

uniform vec2 selection;
uniform sampler2D texture;
uniform sampler2D texture2;


varying vec4 vColor;
varying vec3 borderColor;
varying float uv;
uniform vec2 resolution;
uniform float time;

float aastep(float threshold, float value) {
  #ifdef GL_OES_standard_derivatives
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold-afwidth, threshold+afwidth, value);
  #else
    return step(threshold, value);
  #endif
}

void main() {
  float r = 0.0, delta = 0.0, alpha = 1.0;
  vec2 cxy = 2.0 * gl_PointCoord - 1.0;
  r = dot(cxy, cxy);

  #ifdef GL_OES_standard_derivatives
    delta = fwidth( r);
    alpha = 1.0 - smoothstep(1.0 - delta, 1.0 + delta, r);
  #endif

  float vSize = 1.0;
  float uEdgeSize = 2.;
  float distance = length(2.0 * gl_PointCoord - 1.0);


  float sEdge = smoothstep(
      vSize - uEdgeSize - 2.0,
      vSize - uEdgeSize,
      distance * (vSize + uEdgeSize)
  );
  gl_FragColor = vColor;
  distance = aastep(.5, distance);



  if (uv == -1.)
    gl_FragColor = texture2D(texture2, gl_PointCoord);
  else
  gl_FragColor.a *=  1. - distance;

}
`
const POINT_VS = `
precision mediump float;
uniform mat4 projection;
uniform mat4 model;
uniform mat4 view;


uniform float pointSize;
uniform float scaling;
uniform float sizeAttenuation;

attribute vec4 pos;
attribute vec3 color;
//cluster, visiblity, texture
attribute vec3 stateIndex;
attribute float dates;
attribute float sentiment;
attribute vec2 offset;

uniform float ceiling;

uniform float hoveredPoint;
uniform vec2 dimensions;

uniform float selectedCluster;

uniform bool flatSize;
uniform float showFavorites;
uniform float selectedPoint;


// variables to send to the fragment shader
varying vec4 vColor;
varying vec3 borderColor;
varying float uv;

void main() {
  vec2 position = pos.xy ;/// dimensions;
  uv = ((stateIndex.z < 0. && showFavorites < 0.) || showFavorites == pos.w)? -1. : 0.;

  gl_Position = projection * view * vec4(position.xy, 0.0, 1.);

  vColor = vec4(color, 1);

  float finalScaling = 2.;
  finalScaling += 2. + pow(pos.z, scaling * 1.);

  gl_PointSize = min(pointSize + (exp(log(finalScaling)*sizeAttenuation * .01)), ceiling);
  if (uv == -1.) gl_PointSize = 50.;

  vColor.a = .5;
  if ( (stateIndex[1] == -20.)) vColor.a = .05;
  if ( (stateIndex[1] == -10.)) vColor.a = .75;
  if ( (pos.w == selectedPoint)) vColor.a = 1.;

  if ( (stateIndex[1] == 0.)) vColor.a = .0;

  if (pos.w == hoveredPoint) vColor.a = 1.;
  if (pos.w == hoveredPoint) gl_Position.z = -1.; // reset depth buffer
  if (pos.w == hoveredPoint) gl_PointSize *= 5.;
  else if ( (stateIndex[1] == 10.)) gl_PointSize *= 3.;
  if ( (pos.w == selectedPoint)) gl_PointSize *= 3.;

}
`

export const createDrawPoints = (regl, attributes) => {
  let schema = {}
  var emptyTexture = regl.texture({
    shape: [16, 16]
  })


  let textures = [emptyTexture, emptyTexture]

  circleImg.onload = () => {
    textures[0] = regl.texture({premultiplyAlpha: true, data: circleImg})
  }
  if (circleImg.complete) circleImg.onload()

  starImg.onload = () => {
    textures[1] = regl.texture(starImg)
  }
  if (starImg.complete) starImg.onload()


  schema.attributes = {
        pos: {
          //xy size
          buffer: () => attributes.position,
          size: 4
        },
        color: {
          buffer: () => attributes.color,
          size: 3

        },
        stateIndex: {
          buffer: () => attributes.stateIndex,
          size: 3
        },
      }
  return regl({
      frag: POINT_FS,
      vert: POINT_VS,
      depth: {
   enable: false,

  },

  blend: {
   enable: true,
   func: {
     srcRGB: 'src alpha',
     srcAlpha: 1,
     dstRGB: 'one minus src alpha',
     dstAlpha: 1
   },
   equation: {
     rgb: 'add',
     alpha: 'add'
   },
   color: [0, 0, 0, 0]
  },

      attributes: schema.attributes,

      uniforms: {
        showFavorites: (ctx, state) => state.showFavorites || -10,
        pointSize: regl.prop('pointSize'),
        ceiling: (ctx, state) => state.ceiling,
        time: (context) => { return console.log(context.time) || context.time },
        resolution: [innerWidth, innerHeight],
        hoveredPoint: (ctx, state) => state.hoveredPoint,
        dimensions: [window.innerWidth, window.innerHeight],
        projection:  regl.prop('projection'),
        model: regl.prop('model'),
        view: (ctx, state) => state.camera.view,
        scaling: regl.prop('scaling'),
        sizeAttenuation: regl.prop('sizeAttenuation'),
        flatSize: regl.prop('flatSize'),
        selectedPoint: regl.prop('selectedPoint'),
        texture: () => textures[0],
        texture2: () => textures[1]
      },
      count: attributes.position.length,
      primitive: 'points'
    })

}
