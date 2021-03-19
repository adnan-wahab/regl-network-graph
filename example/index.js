import GraphRenderer from '../src';
import * as d3 from 'd3'
import _ from 'lodash'

let main = () => {
  load('./data/nestle-network.json')
}


let styles = {
    'font-size': '16px',
    'font-weight': '500',
    'background-color': 'rgb(41, 50, 60)',
    'color': 'rgb(160, 167, 180)',
    'z-index': '1001',
    'position': 'fixed',
    'overflow-x': 'auto',
    'top': '541px',
    'max-width': '1000px',
    'right': '185px',
    'width': '200px',
    'display': 'flex',
    'box-sizing': 'border-box',
    'max-width': '100%',
    'color': 'rgb(248, 248, 248)',
    'min-width': '0px',
    'min-height': '0px',
    'flex-direction': 'column',
    'outline': 'none',
    'margin': '6px',
    'background': 'rgb(119, 119, 119)',
    'padding': '12px',
    'opacity': '.8',
    'pointer-events': 'none'

}

let load = (url) => {

  fetch(url)
    .then((body)=>{ return body.json() })
    .then((json)=>{
        window.graph = GraphRenderer.init({
          data: json,
          container: document.querySelector('.container'),
          brush: true,
          width: innerWidth * 1,
          height: innerHeight * .9,
          drawCurves: 1,
        })

          json.cluster_events.forEach((c) => {
            c.clusters.forEach((cluster, clusterIndex) => {
              graph.setNodeColor(cluster.nodes, cluster.color)
            })
          })

        Array.from(document.body.querySelectorAll('input')).forEach(el => {
          el.addEventListener('change', (e) => {
            let x = {}
            x[el.id] = + e.target.value
            graph.setState(x)
            console.log(x

            )
          })
        })

        let tip = d3.select('body').append('div')

        _.each(styles, (key, value) => { tip.style(value, key)})

        graph.on('hover', (i, node, event, coordinates) => {
          if (! node) return console.log('off')
          tip.text(node.text)
          tip.style('display', 'block')
          tip.style('left', coordinates[0] + 'px')
          tip.style('top', coordinates[1] + 'px')

        })

        graph.on('hoverOff', (i, node, event, coordinates) => {
          tip.style('display', 'none')
        })


        let [drawBorder, starRandom, selectRandom, showFavorites, toggleBrush] = document.querySelectorAll('button')

        drawBorder.addEventListener('click', () => {
          graph.setNodeShape(true, 2)
        })


        starRandom.addEventListener('click', () => {
          graph.setNodeShape([Math.random() * 1000 | 0], 1)
        })

        selectRandom.addEventListener('click', () => {
          let choice = Math.random() * 1000 | 0
          graph.setNodeVisibility(true, (d, i) => {
            return (i == choice) ? 10 : -20
          })
          graph.select(choice)

        })

        showFavorites.addEventListener('click', () =>{
          console.log('show favorites');
          graph.setNodeVisibility(true, (d, i) => { return Math.random() > .99 ? 10 : 0 })
        })

        let state = true
        toggleBrush.addEventListener('click', () =>{
          graph.toggleBrush(state = ! state)
        })

        toggleBrush.click()

    })
}
d3.select(window).on('load', main)
