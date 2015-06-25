// an idle game featuring automata and fun

var w = 40
var h = 40
var grid = []
var last = 0
var rate = 1000
var ducats = 1
var paused = false
var handlers = {}
var el_grid, el_ducats

function tick() {
  // poke each cell, in arbitrary order
  for(var i=0; i < w*h; i++) {
    var cell = grid[i]
    if(cell.handler) break
    run(cell, 'go')
    if(!cell.life) {
      run(cell, 'post')
      spawn(cell, " ")
    }
  }
}

function tock(n) {
  // do n ticks
  for(var i=0; i < n; i++) {
    tick()
  }

  // update last tock
  last = Date.now()
}

function render() {
  // update cell display
  render_cells()

  // update stats display
  render_stats()
}

function render_cells() {
  el_grid.textContent = grid_to_string()
}

function grid_to_string() {
  var str = ""
  for(var i=0; i < w*h; i++) {
    if(!i%w) str += "\n"
    str += grid[i].char
  }
  return str
}

function render_stats() {
  el_ducats.textContent = ducats
}

function time_to_tock(ms) {
  // when was our last tock?
  var diff = ms - last

  // how many ticks should we do?
  var ticks = diff / rate

  // call tock
  tock(ticks)
}

function loop() {
  if(paused) return
  var time = Date.now()         // get current time
  time_to_tock(time)
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
    grid[i] = new_cell(i)
  }

  // set up stats
  last = Date.now()
  el_grid = document.getElementById('grid')
  el_ducats = document.getElementById('ducats')

  // set up nabes and diags
  for(var i=0; i < w*h; i++) {
    add_nabes(grid[i], i)
    add_diags(grid[i], i)
  }

  build_archetypes()
}

function add_nabes(cell, index) {
  cell.nabes.push(get_torus_cell(index, 0, -1))
  cell.nabes.push(get_torus_cell(index, 0,  1))
  cell.nabes.push(get_torus_cell(index, -1, 0))
  cell.nabes.push(get_torus_cell(index,  1, 0))
}

function add_diags(cell, index) {
  cell.nabes.push(get_torus_cell(index, 1,  -1))
  cell.nabes.push(get_torus_cell(index, 1,   1))
  cell.nabes.push(get_torus_cell(index, -1,  1))
  cell.nabes.push(get_torus_cell(index, -1, -1))
}

function get_torus_cell(index, dx, dy) {
  if(dx == -1 && index%w == 0)
    dx = w-1
  if(dx ==  1 && index%w == w-1)
    dx = 1-w

  if(dy == -1 && index < w)
    dy = h-1
  if(dy ==  1 && index > w*(h-1))
    dy = 1-h

  return grid[index + dx + dy*w]
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
      if(!free) return
      cell.life -= 1
      spawn(free, String.fromCharCode(char.charCodeAt() - 1))
    })
  })
}

function find_free_nabe(cell) {
  // TODO: check in arbitrary order
  var nabe
  if(nabe = get_torus_cell(cell.index, 0,  1)) return nabe
  if(nabe = get_torus_cell(cell.index, 0, -1)) return nabe
  if(nabe = get_torus_cell(cell.index, 1,  0)) return nabe
  if(nabe = get_torus_cell(cell.index, -1, 0)) return nabe
  return false
}

function run(cell, handler) {
  var hands = cell.handlers[handler]
  var len = hands.length
  for(var i=0; i<len; i++)
    hands[i](cell)
}

function spawn(cell, char) {
  cell.char = char
  cell.handler = handlers[char]
  run(cell, 'init')
}

function new_cell(i) {
  return { char: " "
         , handler: false
         , life: 0
         , index: i
         , nabes: []
         , diags: []
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

init()
