// an idle game featuring automata and fun

/* TODO:
   - pause button
   - "offline" mode catchup is different?
   - fractional respect via Math.random()
   - show buttons / upgrades as they're available
   - different places for button vs upgrades
   - upgrades:
     - per archetype: increase life, increase ducats, increase rate, % increase to children cumulative
     - overall: increate rate, add new game features (capital letters, new letters, symbols, fancy backgrounds (day/night), fertility bonus (w/ fancy highlight for good squares), ...)

*/
var w = 80
var h = 40
var grid = []
var ducats = 1
var paused = false
var last_ms = 0
var last_max = 1
var base_rate = 1000
var base_life = 3
var archetypes = {}
var base_ducats = 1
var render_rate = 100
var current_symbol = 'a'
var el_grid, el_ducats, el_buttons

function tick() {
  // TODO: poke the cells in arbitrary order
  for(var i=0; i < w*h; i++) {
    var cell = grid[i]
    if(!cell.handler) continue
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
  last_ms = Date.now()
}

function time_to_tock(ms) {
  // when was our last tock?
  var diff = ms - last_ms

  // how many ticks should we do?
  // TODO: this doesn't work for ticks < 1
  var ticks = diff / base_rate

  // call tock
  tock(ticks)
}

function loop() {
  if(paused) return
  var time = Date.now()         // get current time
  time_to_tock(time)
  render()
}

function looper() {
  loop()
  // window.requestAnimationFrame(looper)
  window.setTimeout(looper, Math.max(base_rate, render_rate))
}

function set_type(cell, type) {
  cell.char = type
  cell.handler = archetypes[type]
}

function add_nabes(cell, index) {
  cell.nabes.push(get_torus_cell(index, 0, -1))
  cell.nabes.push(get_torus_cell(index, 0,  1))
  cell.nabes.push(get_torus_cell(index, -1, 0))
  cell.nabes.push(get_torus_cell(index,  1, 0))
}

function add_diags(cell, index) {
  cell.diags.push(get_torus_cell(index, 1,  -1))
  cell.diags.push(get_torus_cell(index, 1,   1))
  cell.diags.push(get_torus_cell(index, -1,  1))
  cell.diags.push(get_torus_cell(index, -1, -1))
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
    // create the basic archetype
    archetypes[char] = clone(archetype_archetype)
    archetypes[char].price = Math.pow(4, char.charCodeAt() - 97)

    // set 'life' for cell
    // THINK: different types should have different amounts of life
    addhand(char, 'init', function(cell) {
      cell.life = base_life
    })
  })

  // a adds $ each tick and on revert
  addhand('a', 'go', function(cell) {
    ducats += base_ducats
    cell.life -= 1
  })

  addhand('a', 'post', function(cell) {
    ducats += base_ducats
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
  nabe = get_torus_cell(cell.index, 0,  1)
  if(nabe && nabe.char == " ") return nabe
  nabe = get_torus_cell(cell.index, 0, -1)
  if(nabe && nabe.char == " ") return nabe
  nabe = get_torus_cell(cell.index, 1,  0)
  if(nabe && nabe.char == " ") return nabe
  nabe = get_torus_cell(cell.index, -1, 0)
  if(nabe && nabe.char == " ") return nabe
  return false
}

function run(cell, handler) {
  if(!cell.handler) return
  var hands = cell.handler[handler]
  var len = hands.length
  for(var i=0; i<len; i++)
    hands[i](cell)
}

function spawn(cell, char) {
  cell.char = char
  cell.handler = archetypes[char]
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

var archetype_archetype = { init: []
                          , pre:  []
                          , go:   []
                          , post: []
                          , price: 1
                          }

function addhand(char, handle, fun) {
  archetypes[char][handle].push(fun)
}


// init

function init() {
  // set up grid
  for(var i=0; i < w*h; i++) {
    grid[i] = new_cell(i)
  }

  // set up stats
  last_ms = Date.now()
  var el = document.getElementById.bind(document)
  el_grid = el('grid')
  el_ducats = el('ducats')

  // set up nabes and diags
  for(var i=0; i < w*h; i++) {
    add_nabes(grid[i], i)
    add_diags(grid[i], i)
  }

  // button events
  el_buttons = el('buttons')
  el_buttons.addEventListener('click', function(ev) {
    current_symbol = ev.target.id
    var q = document.querySelectorAll('#buttons span')
    ;[].slice.call(q).forEach(function(el) {el.classList.remove('selected')})
    el(current_symbol).classList.add('selected')
  })
  el_grid.addEventListener('click', function(ev) {
    var index = click_to_index(ev)
    set_symbol(index, current_symbol)
  })

  build_archetypes()
  looper()
}

// buttons

function click_to_index(ev) {
  var sel = window.getSelection()
  // console.log(selection.focusNode.data[selection.focusOffset]);
  var index = sel.focusOffset
  return Math.max(0, index - 1 - Math.floor(index / w)) // remove newlines
}

function set_symbol(index, char) {
  // check ducats
  var price = archetypes[char].price
  if(price > ducats) {
    log("you can't afford that!")
    return
  }

  // THINK: check current symbol is lesser?

  spawn(grid[index], char)
  ducats -= price
}

// renderer

function render() {
  render_cells()
  render_stats()
  render_buttons()
  render_upgrades()
}

function render_cells() {
  el_grid.textContent = grid_to_string()
}

function render_stats() {
  el_ducats.textContent = ducats
}

function render_buttons() {
  if(ducats <= last_max) return

  var new_button = get_new_button(last_max, ducats)
  last_max = ducats
  if(!new_button) return

  // el_buttons.appendAfter(new_button)
  // TODO: innerHTML is kind of a drag
  el_buttons.innerHTML = new_button + el_buttons.innerHTML
}

function render_upgrades() {
}

function grid_to_string() {
  var str = ""
  for(var i=0; i < w*h; i++) {
    if(i%w == 0) str += "\n"
    str += grid[i].char
  }
  return str
}

function get_new_button(low, high) {
  for(var char in archetypes) {
    var price = archetypes[char].price
    if(low < price && price <= high)
      return char_to_button(char)
  }
  return false
}

function char_to_button(char) {
  var str = '<span id="' + char + '">' + char + '</span>'
  return str
}

// helpers

function charloop(from, last, fun) {
  var from_ord = from.charCodeAt()
  var last_ord = last.charCodeAt()
  var args = [].slice.call(arguments, 3)

  for(var i=from_ord; i <= last_ord; i++)
    fun(String.fromCharCode(i), args)
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
