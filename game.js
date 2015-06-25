// an idle game featuring automata and fun

var w = 40
var h = 40
var grid = []
var ducats = 0
var paused = false
var handlers = {}

function tick() {
  // poke each cell, in arbitrary order
}

function tock(n) {
  // do n ticks

  // update last tock
}

function render() {
  // update cell display

  // update counter display
}

function time_to_tock(ms) {
  // when was our last tock?

  // how many ticks should we do?

  // call tock
}

function loop() {
  // if not paused

  // get current time

  // call time_to_tock(ms)
}

function looper() {
  loop()
  window.requestAnimationFrame(looper)
}

function set_type(cell, type) {
  cell.char = type
  cell.handler = handlers[type]
}

function init() {
  // set up grid
  for(var i=0; i < w*h; i++) {
    grid[i] = new_cell()
  }

  // set up stats

  // set up nabes and diags
}

function build_archetypes() {
  // a-z basic countdown (?)
  charloop('a', 'z', function(char) {
    // create the handler
    handlers[char] = clone(handler)

    // set 'life' for cell to 8
    // THINK: different types should have different amounts of life
    addhand(char, 'init', function(cell) {
      cell.life = 8
    })
  })

  // a adds $ each tick and on revert
  addhand('a', 'go', function(cell) {
    ducats += 1
    cell.life -= 1
  })

  addhand('a', 'post', function(cell) {
    ducats += 1
  })

  // b-z spawn N times then revert
  charloop('b', 'z', function(char) {
    addhand(char, 'go', function(cell) {
      var free = find_free_nabe(cell)
      if(!free) return false
      cell.life -= 1
      spawn(free, String.fromCharCode(char.charCodeAt() - 1))
    })
  })
}

function spawn(cell, char) {
  cell.char = char
  cell.handler = handlers[char]
  cell.handler.init(cell)
}

function new_cell() {
  return { char: " "
         , handler: false
         , life: 0
         // , skip: 0
         }
}

var handler = { init: []
              , pre:  []
              , go:   []
              , post: []
              }

function addhand(char, handle, fun) {
  handlers[char][handle].push(fun)
}

// helpers

function charloop(from, last, fun) {
  var from_ord = from.charCodeAt()
  var last_ord = last.charCodeAt()
  var args = [].slice.call(arguments, 3)

  for(var i=from_ord; i < last_ord; i++)
    fun(String.fromCharCode(), args)
}

function noop() {}

function clone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj))
  } catch(e) {
    log(e)
    return {}
  }
}

function log(x) {
  console.log(x)
}
