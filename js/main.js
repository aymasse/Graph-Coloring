let Color = {
  AMBER: '#ffc107',
  BLUE: '#2196F3',
  BROWN: '#795548',
  CYAN: '#00bcd4',
  GREEN: '#4CAF50',
  INDIGO: '#3f51b5',
  KHAKI: '#f0e68c',
  LIME: '#cddc39',
  ORANGE: '#ff9800',
  PINK: '#e91e63',
  PURPLE: '#9c27b0',
  RED: '#f44336',
  TEAL: '#009688',
  YELLOW: '#ffeb3b',
  WHITE: '#fff',
  BLACK: '#000',
  GREY: '#bbb',
}

let GraphModel = {
  BALANCEDTREE: 1,
  BARABASIALBERT: 2,
  ERDOSRENYINP: 3,
  ERDOSRENYINM: 4,
  WATTSSTROGATZALPHA: 5,
  WATTSSTROGATZBETA: 6
}

let graph
let DSATColorsSet = new Set()
let DSATIdToColorMap = new Map()

let playIdToColorMap = new Map()

$(function () {

  let cy = cytoscape({

    container: $('#cy'),
    boxSelectionEnabled: false,
    autounselectify: true,
    minZoom: 0.5,
    maxZoom: 2,
    //On ready function
    ready: function () {
      window.cy = this
    }
  })

  getDefaultStartGraph()
  //Cytoscape layout & style
  setCystoscapeLayout()
  setCytoscapeStyle()
  //Listeners
  setListeners()
  //Coloring algorithm
  DSATAlgorithm()
  //qTip content
  setQTip()
  setColorPickersListeners()
})

function getDefaultStartGraph () {
  setNewElements(8, 1 / 3, 'circle')
}

function setCystoscapeLayout () {
  cy.layout({
    name: 'circle'
  }).run()
}

function setCytoscapeStyle () {
  cy.style().fromJson([
    {
      selector: 'node',
      style: {
        'background-color': Color.GRAY,
        'label': 'data(label)'
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 3,
        'line-color': '#bbc8cc',
        'target-arrow-color': '#ccc'
      }
    }
  ]).update()
}

function getGraph (graphModel, params) {
  switch (graphModel) {
    case GraphModel.ERDOSRENYINP:
      return RandomGraph.ErdosRenyi.np(params.n, params.p)
      break
    case GraphModel.ERDOSRENYINM:
      return RandomGraph.ErdosRenyi.nm(params.n, params.m)
      break
    case GraphModel.BALANCEDTREE:
      return RandomGraph.BalancedTree(params.r, params.h)
      break
    case GraphModel.BARABASIALBERT:
      return RandomGraph.BarabasiAlbert(params.N, params.m0, params.M)
      break
    case GraphModel.WATTSSTROGATZALPHA:
      return RandomGraph.WattsStrogatz.alpha(params.n, params.k, params.alpha)
      break
    case GraphModel.WATTSSTROGATZBETA:
      return RandomGraph.WattsStrogatz.beta(params.n, params.k, params.beta)
      break
  }

  return null
}

//Return graph elements from the desired model
function getElements (graphModel, params) {
  graph = getGraph(graphModel, params)

  if (graph === null) {
    return null
  }

  let elements = []

  graph.nodes.forEach((node) => {
    if (node !== null && node !== undefined) {
      let id = node.label.split(' ').pop()
      elements.push({
        group: 'nodes',
        data: {
          id: 'n' + id,
          label: id
        },
        classes: 'node'
      })
    }
  })

  graph.edges.forEach((edge) => {
    if (edge !== null && edge !== undefined) {
      elements.push({
        group: 'edges',
        data: {
          source: 'n' + edge.source,
          target: 'n' + edge.target
        },
        classes: 'edge'
      })
    }
  })

  return elements
}

function getColorPickers (id) {
  let node = cy.getElementById(id)
  let possibleColors = getPossibleColors(getNeighborhoodColors(node, playIdToColorMap))

  let buttons = ''

  possibleColors.forEach((color) => {
    if (playIdToColorMap.has(id)) {
      if (playIdToColorMap.get(id) !== color) {
        buttons += '<button id="button_' + id + '_' + color.toLowerCase() + '" class="colorPicker w3-btn w3-circle w3-' + color.toLowerCase() + '">+</button>'
      }
    } else {
      buttons += '<button id="button_' + id + '_' + color.toLowerCase() + '" class="colorPicker w3-btn w3-circle w3-' + color.toLowerCase() + '">+</button>'
    }
  })

  if (playIdToColorMap.has(id)) {
    buttons += '<button id="buttonClear_' + id + '" class="colorClear w3-btn w3-circle w3-grey">+</button>'
  }

  if (buttons === '') {
    buttons += 'No available color'
  }

  return buttons
}

function setColorPickersListeners () {
  $('.colorPicker').click((event) => {
    hideQTip()
    let properties = event.target.id.split('_')
    let color = properties.pop().toUpperCase()
    let nodeId = properties.pop()
    colorNode(nodeId, color)
    playIdToColorMap.set(nodeId, color)

    //All nodes are colored
    if (playIdToColorMap.size === DSATIdToColorMap.size) {
      alert('Congratulations !')
      location.reload()
    }

    disableQTip()
    destroyQTip()
    setQTip()
    setColorPickersListeners()
  })

  $('.colorClear').click((event) => {
    hideQTip()
    let nodeId = event.target.id.split('_').pop()
    playIdToColorMap.delete(nodeId)
    colorNode(nodeId, 'GREY')
    disableQTip()
    destroyQTip()
    setQTip()
    setColorPickersListeners()
  })
}

function setQTip () {
  let nodes = cy.$('.node')

  nodes.forEach((node) => {
    node.qtip({
      prerender: true,
      overwrite: true,
      content: getColorPickers(node.attr('id')),
      position: {
        my: 'top center',
        at: 'bottom center'
      },
      style: {
        classes: 'qtip-bootstrap',
        tip: {
          width: 16,
          height: 8
        }
      }
    })
  })
}

function disableQTip () {
  let nodes = cy.$('.node')

  nodes.forEach((node) => {
    node.qtip('api').disable()
  })
}

function destroyQTip () {
  let nodes = cy.$('.node')

  nodes.forEach((node) => {
    node.qtip('api').destroy()
  })
}

function hideQTip () {
  let nodes = cy.$('.node')

  nodes.forEach((node) => {
    node.qtip('api').hide()
  })
}

function colorNode (id, color) {
  let selector = 'node#' + id
  cy.style().selector(selector).style('background-color', Color[color]).update()
}

function setGenerateButtonListener () {
  $('#generateButton').click(() => {
    let nbNodesInput = document.getElementById('NbNodes')
    let probEdgeInput = document.getElementById('ProbEdge')
    let SelectLayout = document.getElementById('layoutsSelector')
    let nbNodes = clamp(nbNodesInput.value, nbNodesInput.min, nbNodesInput.max)
    let probEdge = clamp(probEdgeInput.value, probEdgeInput.min, probEdgeInput.max) / 100
    let layout = SelectLayout.value

    setNewElements(nbNodes, probEdge, layout)
    DSATIdToColorMap.clear()
    DSATColorsSet.clear()
    playIdToColorMap.clear()
    setCytoscapeStyle()
    DSATAlgorithm()
    setQTip()
    setColorPickersListeners()
  })
}

function setColorButtonListener () {
  $('#colorButton').click(() => {
    colorGraphFromDSAT()
    disableQTip()
  })
}

function setClearButtonListener () {
  $('#clearButton').click(() => {
    setCytoscapeStyle()
    playIdToColorMap.clear()
    setQTip()
    setColorPickersListeners()
  })
}

function setListeners () {
  setGenerateButtonListener()
  setColorButtonListener()
  setClearButtonListener()
}

function setNewElements (nbNodes, probEdge, layout) {
  cy.remove('node')
  cy.add(getElements(GraphModel.ERDOSRENYINP, {n: nbNodes, p: probEdge}))
  cy.layout({
    name: layout,
    directed: false
  }).run()
}

function DSATAlgorithm () {
  let startTime = new Date()
  let nodes = Array.from(cy.collection('node'))

  //Phase 1
  nodes.sort((a, b) => {
    return a.degree(false) - b.degree(false)
  })

  //Phase 2 & 3
  while (nodes.length > 0) {
    nodes.sort((a, b) => {
      let dsat = DSAT(a, DSATIdToColorMap) - DSAT(b, DSATIdToColorMap)

      if (dsat < 0) {
        //a has a lower saturation
        return dsat
      } else if (dsat > 0) {
        //b has a lower saturation
        return dsat
      } else {
        //a and b have the same saturation
        return a.degree(false) - b.degree(false)
      }
    })

    let nodeToColor = nodes.pop()
    console.log('Node to color')
    console.log(nodeToColor.id())

    //Phase 4
    let newColor = getLowestColorForNode(DSATColorsSet, nodeToColor, DSATIdToColorMap)
    DSATColorsSet.add(newColor)
    DSATIdToColorMap.set(nodeToColor.id(), newColor)
    console.log('New color')
    console.log(newColor)
    console.log('-----------')
  }

  //Phase 5
  console.log('===============================')
  console.log(DSATColorsSet)

  let endTime = new Date()
  let elapsedTime = endTime - startTime
  console.log('Elapsed time : ' + elapsedTime + 'ms')
}

function colorGraphFromDSAT () {
  DSATIdToColorMap.forEach((value, key) => {
    let selector = 'node#' + key
    cy.style().selector(selector).style('background-color', Color[value]).update()
  })
}

function getPossibleColors (neighborhoodColors) {
  let possibleColors = new Set()

  DSATColorsSet.forEach((color) => {
    if (!neighborhoodColors.has(color)) {
      possibleColors.add(color)
    }
  })

  return possibleColors
}

function getLowestColorForNode (colorsSet, node, colorMap) {
  let neighborhoodColors = getNeighborhoodColors(node, colorMap)
  let possibleColors = getPossibleColors(neighborhoodColors)

  console.log('Neighborhood colors')
  console.log(neighborhoodColors)
  console.log('Colors set')
  console.log(colorsSet)
  console.log('Possible colors')
  console.log(possibleColors)

  if (possibleColors.size <= 0) {
    //If we do not have a possible color in our set, we pick a new one
    return getNonPickedColor(colorsSet)
  } else {
    //We count how many times each color is used
    let colorsCounter = {}

    colorMap.forEach((value) => {
      if (possibleColors.has(value)) {
        colorsCounter[value] = (colorsCounter[value] || 0) + 1
      }
    })

    let colorsCounterArray = []

    Object.keys(colorsCounter).forEach((color) => {
      colorsCounterArray.push([color, colorsCounter[color]])
    })

    //We sort our array of colors by usage
    colorsCounterArray.sort((a, b) => {
      return a[1] - b[1]
    })

    console.log('Counter array')
    console.log(colorsCounterArray)

    return colorsCounterArray[0][0]
  }
}

function getNonPickedColor (colorsSet) {
  console.log('Colors set before pick')
  console.log((colorsSet))
  let pickedColor = null

  let colors = Object.keys(Color)
  colors = shuffle(colors)

  colors.forEach((color) => {
    if (pickedColor === null && color !== 'WHITE' && color !== 'GREY' && !colorsSet.has(color)) {
      pickedColor = color
    }
  })
  console.log('Picked color')
  console.log(pickedColor)

  return pickedColor
}

/**
 * @return {number}
 */
function DSAT (node, colorMap) {
  return getNeighborhoodColors(node, colorMap).size
}

function getNeighborhoodColors (node, colorMap) {
  let colors = new Set()

  let neighborhood = node.neighborhood('node')

  neighborhood.forEach((neighbor) => {
    if (colorMap.has(neighbor.id())) {
      colors.add(colorMap.get(neighbor.id()))
    }
  })

  return colors
}

function clamp (val, min, max) {
  return Math.min(Math.max(val, min), max)
}

//Fisher-Yates Shuffle
function shuffle (array) {
  let counter = array.length

  // While there are elements in the array
  while (counter > 0) {
    // Pick a random index
    let index = Math.floor(Math.random() * counter)

    // Decrease counter by 1
    counter--

    // And swap the last element with it
    let temp = array[counter]
    array[counter] = array[index]
    array[index] = temp
  }

  return array
}